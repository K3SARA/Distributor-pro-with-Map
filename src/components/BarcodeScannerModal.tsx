import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Camera,
  Flashlight,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Barcode,
  Keyboard,
  Zap,
  Volume2,
  VolumeX
} from 'lucide-react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (decodedText: string) => Promise<boolean | void> | boolean | void;
  title?: string;
  subtitle?: string;
}

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
  isOpen,
  onClose,
  onScan,
  title = 'Scan Product Barcode',
  subtitle = 'Point camera at any product 1D barcode or QR code'
}) => {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const readerElementId = 'camera-barcode-reader-viewport';

  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [torchSupported, setTorchSupported] = useState<boolean>(false);
  const [torchOn, setTorchOn] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [continuousMode, setContinuousMode] = useState<boolean>(true);
  const [scannedCount, setScannedCount] = useState<number>(0);
  const [lastScannedItem, setLastScannedItem] = useState<{ code: string; success: boolean; message: string } | null>(null);

  // Manual fallback input
  const [showManualInput, setShowManualInput] = useState<boolean>(false);
  const [manualCode, setManualCode] = useState<string>('');

  const lastScannedCodeRef = useRef<string>('');
  const lastScannedTimeRef = useRef<number>(0);

  // Synthesize crisp retail scanner beep using Web Audio API
  const playBeep = () => {
    if (!soundEnabled) return;
    try {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtxClass) return;
      const audioCtx = new AudioCtxClass();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(1450, audioCtx.currentTime); // 1450 Hz classic retail beep
      gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.09);

      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.09);
    } catch {
      // Audio context might be restricted before user gesture
    }
  };

  // Haptic vibration feedback
  const triggerHaptic = () => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate([40, 25, 40]);
      } catch {
        // Ignore if vibration fails
      }
    }
  };

  // Process decoded barcode or SKU
  const handleDecodedText = async (decodedText: string) => {
    const cleanCode = decodedText.trim();
    if (!cleanCode) return;

    // Debounce duplicate scans of the exact same code within 1.4s
    const now = Date.now();
    if (lastScannedCodeRef.current === cleanCode && now - lastScannedTimeRef.current < 1400) {
      return;
    }

    lastScannedCodeRef.current = cleanCode;
    lastScannedTimeRef.current = now;

    playBeep();
    triggerHaptic();

    try {
      const result = await onScan(cleanCode);
      const isSuccess = result !== false;

      setScannedCount(prev => prev + 1);
      setLastScannedItem({
        code: cleanCode,
        success: isSuccess,
        message: isSuccess ? `Added to cart (${cleanCode})` : `Not found in catalog (${cleanCode})`
      });

      // Clear the feedback notification after 3.5 seconds
      setTimeout(() => {
        setLastScannedItem(prev => (prev?.code === cleanCode ? null : prev));
      }, 3500);

      // In single-scan mode, close the modal on first scan
      if (!continuousMode && isSuccess) {
        setTimeout(() => {
          onClose();
        }, 500);
      }
    } catch (err: any) {
      setLastScannedItem({
        code: cleanCode,
        success: false,
        message: err.message || `Error scanning ${cleanCode}`
      });
    }
  };

  // Initialize and start camera
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    setCameraError(null);
    setScannedCount(0);
    setLastScannedItem(null);

    const initScanner = async () => {
      try {
        // Wait for DOM element to mount
        await new Promise(r => setTimeout(r, 100));
        if (!isMounted) return;

        const container = document.getElementById(readerElementId);
        if (!container) return;

        const formatsToSupport = [
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.CODE_93,
          Html5QrcodeSupportedFormats.QR_CODE,
          Html5QrcodeSupportedFormats.ITF
        ];

        const html5QrCode = new Html5Qrcode(readerElementId, {
          formatsToSupport,
          verbose: false
        });

        scannerRef.current = html5QrCode;

        // Ideal configuration for handheld smartphone scanning
        const config = {
          fps: 15,
          qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
            const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
            const boxWidth = Math.floor(minEdge * 0.85);
            const boxHeight = Math.floor(minEdge * 0.55); // Rectangular barcode aspect ratio
            return { width: Math.max(220, boxWidth), height: Math.max(140, boxHeight) };
          },
          aspectRatio: 1.0
        };

        await html5QrCode.start(
          { facingMode: 'environment' }, // Back camera on smartphone
          config,
          (decodedText: string) => {
            if (isMounted) {
              handleDecodedText(decodedText);
            }
          },
          () => {
            // Frame analyzed without detectable barcode - ignore
          }
        );

        if (isMounted) {
          setIsScanning(true);
          // Check if flashlight/torch is supported
          try {
            const trackCapabilities = html5QrCode.getRunningTrackCapabilities();
            if (trackCapabilities && (trackCapabilities as any).torch) {
              setTorchSupported(true);
            }
          } catch {
            setTorchSupported(false);
          }
        }
      } catch (err: any) {
        console.warn('[BarcodeScanner] Camera init error:', err);
        if (isMounted) {
          setIsScanning(false);
          setCameraError(
            err.name === 'NotAllowedError'
              ? 'Camera permission was denied. Please allow camera access in your browser settings.'
              : err.name === 'NotFoundError'
              ? 'No camera found on this device. You can type the barcode/SKU below.'
              : 'Unable to start camera scanner. Use manual barcode input below.'
          );
          setShowManualInput(true);
        }
      }
    };

    initScanner();

    return () => {
      isMounted = false;
      if (scannerRef.current) {
        try {
          if (scannerRef.current.isScanning) {
            scannerRef.current.stop().catch(() => {});
          }
          scannerRef.current.clear();
        } catch {
          // Cleanup ignore
        }
        scannerRef.current = null;
      }
    };
  }, [isOpen]);

  // Flashlight / Torch toggle
  const toggleTorch = async () => {
    if (!scannerRef.current || !torchSupported) return;
    try {
      const nextState = !torchOn;
      await (scannerRef.current as any).applyVideoConstraints({
        advanced: [{ torch: nextState }]
      });
      setTorchOn(nextState);
    } catch (err) {
      console.warn('Failed to toggle torch', err);
    }
  };

  // Manual submission
  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualCode.trim()) {
      handleDecodedText(manualCode.trim());
      setManualCode('');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex flex-col justify-between sm:items-center sm:justify-center sm:p-4 animate-in fade-in duration-200">
      <div className="w-full sm:max-w-md bg-slate-950 sm:rounded-3xl border border-slate-800 shadow-2xl flex flex-col h-full sm:h-auto sm:max-h-[92vh] overflow-hidden text-white relative">
        {/* Header */}
        <div className="p-4 flex items-center justify-between border-b border-white/10 shrink-0 bg-slate-900/90 backdrop-blur-md">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs shrink-0">
              <Camera className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-bold truncate text-white">{title}</h2>
              <p className="text-[11px] text-slate-400 font-medium truncate">{subtitle}</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* Audio Toggle */}
            <button
              type="button"
              onClick={() => setSoundEnabled(prev => !prev)}
              className={`p-2 rounded-xl transition ${
                soundEnabled ? 'text-blue-400 hover:bg-white/10' : 'text-slate-500 hover:bg-white/5'
              }`}
              title={soundEnabled ? 'Mute Beep Sound' : 'Enable Beep Sound'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            {/* Torch / Flashlight Toggle (if camera supports it) */}
            {torchSupported && isScanning && (
              <button
                type="button"
                onClick={toggleTorch}
                className={`p-2 rounded-xl transition ${
                  torchOn ? 'bg-amber-400 text-slate-950 shadow-xs' : 'text-slate-300 hover:bg-white/10'
                }`}
                title={torchOn ? 'Turn Off Flashlight' : 'Turn On Flashlight'}
              >
                <Flashlight className="w-4 h-4" />
              </button>
            )}

            {/* Close */}
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Viewfinder Canvas Area */}
        <div className="relative flex-1 bg-black flex items-center justify-center overflow-hidden min-h-[300px] sm:min-h-[360px]">
          {/* HTML5 QR Code Video Target */}
          <div id={readerElementId} className="w-full h-full flex items-center justify-center [&_video]:w-full [&_video]:h-full [&_video]:object-cover" />

          {/* Futuristic Overlay with Reticle & Animated Green Laser Line */}
          {isScanning && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              {/* Dimmed surrounding mask */}
              <div className="relative w-64 h-44 rounded-2xl border-2 border-white/40 shadow-[0_0_0_9999px_rgba(0,0,0,0.55)]">
                {/* 4 Corner Guide Accents */}
                <span className="absolute -top-1 -left-1 w-5 h-5 border-t-4 border-l-4 border-blue-500 rounded-tl-lg" />
                <span className="absolute -top-1 -right-1 w-5 h-5 border-t-4 border-r-4 border-blue-500 rounded-tr-lg" />
                <span className="absolute -bottom-1 -left-1 w-5 h-5 border-b-4 border-l-4 border-blue-500 rounded-bl-lg" />
                <span className="absolute -bottom-1 -right-1 w-5 h-5 border-b-4 border-r-4 border-blue-500 rounded-br-lg" />

                {/* Animated Green Scanning Laser Bar */}
                <div className="absolute left-2 right-2 h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_8px_#10B981] animate-bounce duration-1000" />

                {/* Reticle center crosshair */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-[10px] text-white/60 font-semibold uppercase tracking-wider bg-black/40 px-2 py-0.5 rounded-full border border-white/10 backdrop-blur-xs">
                    Align Barcode
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Camera Error Message State */}
          {cameraError && (
            <div className="absolute inset-0 p-6 flex flex-col items-center justify-center text-center bg-slate-950/95 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center border border-rose-500/30">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-bold text-white">Camera Unavailable</p>
                <p className="text-xs text-slate-400 mt-1 max-w-xs">{cameraError}</p>
              </div>
              <button
                type="button"
                onClick={() => setShowManualInput(true)}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-2 shadow-xs transition"
              >
                <Keyboard className="w-4 h-4" />
                <span>Enter Barcode Manually</span>
              </button>
            </div>
          )}

          {/* Scanned Feedback Notification HUD */}
          {lastScannedItem && (
            <div className="absolute bottom-4 left-4 right-4 z-20 animate-in slide-in-from-bottom duration-200">
              <div
                className={`p-3 rounded-2xl border shadow-xl flex items-center gap-2.5 backdrop-blur-md ${
                  lastScannedItem.success
                    ? 'bg-emerald-950/90 border-emerald-500/40 text-emerald-200'
                    : 'bg-rose-950/90 border-rose-500/40 text-rose-200'
                }`}
              >
                {lastScannedItem.success ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold leading-tight truncate">{lastScannedItem.message}</p>
                  <p className="text-[10px] opacity-75 font-mono truncate">{lastScannedItem.code}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer & Controls */}
        <div className="p-3.5 bg-slate-900 border-t border-white/10 shrink-0 space-y-2.5">
          {/* Continuous Scanning Mode Toggle Strip */}
          <div className="flex items-center justify-between text-xs px-1">
            <div className="flex items-center gap-2">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span className="font-semibold text-slate-300">Continuous Auto-Add</span>
            </div>

            <button
              type="button"
              onClick={() => setContinuousMode(prev => !prev)}
              className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition border cursor-pointer ${
                continuousMode
                  ? 'bg-blue-600/30 text-blue-300 border-blue-500/50'
                  : 'bg-white/5 text-slate-400 border-white/10'
              }`}
            >
              {continuousMode ? '⚡ Active (Keep Scanning)' : 'Single Scan'}
            </button>
          </div>

          {/* Manual Input Toggle / Form */}
          {showManualInput ? (
            <form onSubmit={handleManualSubmit} className="flex gap-2">
              <input
                type="text"
                autoFocus
                value={manualCode}
                onChange={e => setManualCode(e.target.value)}
                placeholder="Type barcode (e.g. 479... or SKU)"
                className="flex-1 bg-black/50 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono font-bold"
              />
              <button
                type="submit"
                disabled={!manualCode.trim()}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-xs font-bold rounded-xl transition cursor-pointer shrink-0"
              >
                Add
              </button>
              <button
                type="button"
                onClick={() => setShowManualInput(false)}
                className="p-2 text-slate-400 hover:text-white"
                title="Hide keyboard"
              >
                ✕
              </button>
            </form>
          ) : (
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setShowManualInput(true)}
                className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white font-semibold py-1 px-2 rounded-lg transition"
              >
                <Barcode className="w-4 h-4 text-slate-400" />
                <span>Type Barcode / SKU</span>
              </button>

              {scannedCount > 0 && (
                <span className="text-[11px] font-bold text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded-full border border-emerald-400/30 font-mono">
                  {scannedCount} items scanned
                </span>
              )}

              <button
                type="button"
                onClick={onClose}
                className="px-4 py-1.5 rounded-xl bg-white text-slate-900 font-bold text-xs hover:bg-slate-200 transition cursor-pointer"
              >
                Done
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

