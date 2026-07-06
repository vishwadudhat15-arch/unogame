import { useState, useEffect, useRef } from 'react';

export default function AdOverlay() {
    const [visible, setVisible] = useState(false);
    const [timeLeft, setTimeLeft] = useState(5);
    const [isClosable, setIsClosable] = useState(false);
    const [useFallback, setUseFallback] = useState(true);
    const closeBtnRef = useRef(null);
    const adRef = useRef(null);

    useEffect(() => {
        const handleShowAd = () => {
            // Detect device directly — no sessionStorage dependency
            const isMobile =
                /Mobi|Android|iPhone|iPad|iPod|Windows Phone|webOS/i.test(navigator.userAgent) ||
                window.innerWidth < 768;

            const params = new URLSearchParams(window.location.search);
            const isExplicitlyDisabled = params.get('mobile') === 'false' || params.get('desktop') === 'false';

            if (isExplicitlyDisabled) {
                console.log(
                    '%c[Ads] Suppressed — Ads explicitly disabled via URL parameter (?mobile=false or ?desktop=false).',
                    'color: #ff4a4a; font-weight: bold;'
                );
                return;
            }
            console.log('%c[Ads] Showing ✅', 'color: #4caf50; font-weight: bold;');


            // Log analytics for ad show
            if (window.gtag) {
                window.gtag('event', 'show_initial_ad', {
                    'event_category': 'Engagement',
                    'event_label': 'Ad Shown'
                });
            } else if (window.dataLayer) {
                window.dataLayer.push({
                    event: 'show_initial_ad',
                    timestamp: new Date().toISOString()
                });
            }
            console.log('%c[Analytics] Event Logged: show_initial_ad', 'color: #ffd700; font-weight: bold;');

            setVisible(true);
            setTimeLeft(5);
            setIsClosable(false);
            setUseFallback(true);
        };

        window.show_initial_ad = () => {
            window.dispatchEvent(new CustomEvent('ws_show_ad'));
        };

        window.addEventListener('ws_show_ad', handleShowAd);
        return () => {
            window.removeEventListener('ws_show_ad', handleShowAd);
            delete window.show_initial_ad;
        };
    }, []);

    useEffect(() => {
        if (!visible) return;

        // Start timer countdown
        const interval = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    clearInterval(interval);
                    setIsClosable(true);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        // Try initializing Google Ads
        try {
            (window.adsbygoogle = window.adsbygoogle || []).push({});
        } catch (e) {
            console.warn('AdSense initialization warning:', e);
        }

        // Start checking if AdSense loads an ad (checks periodically for up to 5 seconds)
        let checkCount = 0;
        const checkInterval = setInterval(() => {
            const ins = adRef.current;
            if (ins) {
                const isAdLoaded = ins.innerHTML.trim().length > 0 || ins.getAttribute('data-ad-status') === 'filled';
                if (isAdLoaded) {
                    setUseFallback(false);
                    clearInterval(checkInterval);
                }
            }
            checkCount++;
            if (checkCount >= 10) { // Stop checking after 5 seconds (10 * 500ms)
                clearInterval(checkInterval);
            }
        }, 500);

        return () => {
            clearInterval(interval);
            clearInterval(checkInterval);
        };
    }, [visible]);

    // Keyboard support (Escape key to close if closable)
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape' && isClosable) {
                handleClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isClosable]);

    // Focus close button when active for accessibility
    useEffect(() => {
        if (isClosable && closeBtnRef.current) {
            closeBtnRef.current.focus();
        }
    }, [isClosable]);

    const handleClose = () => {
        setVisible(false);
        // Log analytics for ad close
        if (window.gtag) {
            window.gtag('event', 'ad_closed', {
                'event_category': 'Engagement',
                'event_label': 'Ad Closed'
            });
        }
        console.log('%c[Analytics] Event Logged: ad_closed', 'color: #48cfad; font-weight: bold;');
    };

    if (!visible) return null;

    // SVG Circular Progress Constants
    const radius = 16;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (timeLeft / 5) * circumference;

    return (
        <div
            id="ws-sponsored-overlay-panel"
            role="dialog"
            aria-modal="true"
            aria-label="Sponsored Advertisement"
            style={{
                position: 'fixed',
                inset: 0,
                backgroundColor: 'rgba(3, 8, 28, 0.90)',
                backdropFilter: 'blur(20px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 9999,
                fontFamily: "'Outfit', 'Segoe UI', sans-serif",
                color: '#ffffff',
                animation: 'ws-promo-fadein 0.35s ease forwards'
            }}
        >
            <style>{`
                @keyframes ws-promo-fadein {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes card-zoom {
                    from { transform: scale(0.9) translateY(20px); opacity: 0; }
                    to { transform: scale(1) translateY(0); opacity: 1; }
                }
                @keyframes ws-timer-pulse {
                    0%, 100% { transform: scale(1); box-shadow: 0 0 12px rgba(0, 245, 255, 0.3); }
                    50% { transform: scale(1.04); box-shadow: 0 0 24px rgba(0, 245, 255, 0.6); }
                }
                .ws-overlay-control-btn {
                    transition: all 0.22s cubic-bezier(0.34, 1.56, 0.64, 1);
                }
                .ws-overlay-control-btn:hover {
                    transform: translateY(-2px);
                    filter: brightness(1.15) saturate(1.1);
                }
                .ws-overlay-control-btn:active {
                    transform: translateY(1px);
                    filter: brightness(0.92);
                }
            `}</style>

            {/* Main Ad Card Container */}
            <div
                style={{
                    position: 'relative',
                    width: 340,
                    background: 'linear-gradient(145deg, rgba(10, 20, 50, 0.95), rgba(4, 8, 24, 0.98))',
                    borderRadius: 24,
                    border: '2px solid rgba(0, 245, 255, 0.25)',
                    padding: 20,
                    boxShadow: '0 24px 60px rgba(0, 0, 0, 0.8), 0 0 50px rgba(0, 245, 255, 0.15)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    textAlign: 'center',
                    animation: 'card-zoom 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
                    zIndex: 10000
                }}
            >
                {/* Header Section */}
                <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, position: 'relative', zIndex: 10 }}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        background: 'rgba(255, 255, 255, 0.08)',
                        padding: '4px 10px',
                        borderRadius: 12,
                        fontSize: 11,
                        fontWeight: 700,
                        color: 'rgba(255,255,255,0.6)',
                        letterSpacing: '0.06em',
                        textTransform: 'uppercase'
                    }}>
                        <span>📢</span> Advertisement
                    </div>

                    {/* Circular Timer & Close Button */}
                    <div style={{ position: 'relative', width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>
                        {!isClosable ? (
                            <>
                                <svg width="44" height="44" style={{ transform: 'rotate(-90deg)', position: 'absolute', inset: 0 }}>
                                    <circle
                                        cx="22"
                                        cy="22"
                                        r={radius}
                                        fill="transparent"
                                        stroke="rgba(255, 255, 255, 0.12)"
                                        strokeWidth="3.5"
                                    />
                                    <circle
                                        cx="22"
                                        cy="22"
                                        r={radius}
                                        fill="transparent"
                                        stroke="#00f5ff"
                                        strokeWidth="3.5"
                                        strokeDasharray={circumference}
                                        strokeDashoffset={strokeDashoffset}
                                        style={{ transition: 'stroke-dashoffset 1s linear' }}
                                    />
                                </svg>
                                <span style={{ fontSize: 13, fontWeight: 900, color: '#00f5ff', zIndex: 2 }}>{timeLeft}</span>
                            </>
                        ) : (
                            <button
                                ref={closeBtnRef}
                                onClick={handleClose}
                                aria-label="Close Advertisement"
                                className="ws-overlay-control-btn"
                                style={{
                                    width: 38,
                                    height: 38,
                                    borderRadius: '50%',
                                    border: '2px solid #00f5ff',
                                    background: 'rgba(0, 245, 255, 0.15)',
                                    color: '#00f5ff',
                                    fontSize: 16,
                                    fontWeight: 900,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    animation: 'ws-timer-pulse 1.8s ease-in-out infinite',
                                    outline: 'none',
                                    position: 'relative',
                                    zIndex: 10
                                }}
                            >
                                ✕
                            </button>
                        )}
                    </div>
                </div>

                {/* Ad Container Box */}
                <div style={{
                    width: 300,
                    height: 250,
                    background: 'rgba(0,0,0,0.3)',
                    borderRadius: 12,
                    overflow: 'hidden',
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '1.5px dashed rgba(0, 245, 255, 0.3)',
                    marginBottom: 16
                }}>
                    {/* Google AdSense ins block */}
                    <ins
                        className="adsbygoogle"
                        style={{ display: 'inline-block', width: '300px', height: '250px' }}
                        data-ad-client="ca-pub-XXXXXXXXXXXXXXXX"
                        data-ad-slot="YYYYYYYYYY"
                        ref={adRef}
                    ></ins>

                    {/* Fallback Placeholder (shown on localhost, with adblock, or before ad loads) */}
                    {useFallback && (
                        <div style={{
                            position: 'absolute',
                            inset: 0,
                            background: 'linear-gradient(135deg, #0f172a, #1e293b)',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'center',
                            alignItems: 'center',
                            padding: 16,
                            color: '#94a3b8',
                            textAlign: 'center',
                            fontFamily: "'Outfit', 'Segoe UI', sans-serif"
                        }}>
                            <div style={{ fontSize: 28, marginBottom: 12 }}>📊</div>
                            <div style={{ fontSize: 14, fontWeight: 900, color: '#f8fafc', marginBottom: 4, letterSpacing: '0.02em' }}>
                                Google AdSense
                            </div>
                            <div style={{ fontSize: 11, color: '#00f5ff', fontFamily: 'monospace', marginBottom: 12 }}>
                                ca-pub-XXXXXXXXXXXXXXXX<br />
                                slot: YYYYYYYYYY
                            </div>
                            <div style={{ fontSize: 10, lineHeight: '1.4', color: '#64748b', maxWidth: 250 }}>
                                AdSense tag is active. Live ads will automatically load when this is hosted on an approved domain.
                            </div>
                        </div>
                    )}
                </div>

                {/* Skip Button */}
                <div style={{ width: '100%', position: 'relative', zIndex: 10 }}>
                    {!isClosable ? (
                        <div style={{
                            padding: '12px',
                            borderRadius: 40,
                            border: '1.5px solid rgba(255,255,255,0.15)',
                            color: 'rgba(255,255,255,0.4)',
                            fontSize: 13,
                            fontWeight: 700,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: 'rgba(255,255,255,0.02)'
                        }}>
                            Skip in {timeLeft}s
                        </div>
                    ) : (
                        <button
                            onClick={handleClose}
                            className="ws-overlay-control-btn"
                            style={{
                                width: '100%',
                                padding: '12px 20px',
                                borderRadius: 40,
                                border: '1.5px solid #00f5ff',
                                background: 'rgba(0, 245, 255, 0.15)',
                                color: '#00f5ff',
                                fontSize: 13,
                                fontWeight: 900,
                                cursor: 'pointer',
                                fontFamily: 'inherit',
                                boxShadow: '0 0 12px rgba(0, 245, 255, 0.3)',
                                position: 'relative',
                                zIndex: 10
                            }}
                        >
                            Skip Ad
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}