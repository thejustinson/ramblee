"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";

export default function Home() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", () => {
      setIsInstalled(true);
      setIsInstallable(false);
    });

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt
      );
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      alert(
        'To install: \n\n• Desktop: Look for the install icon in your address bar\n• Mobile: Use "Add to Home Screen" from your browser menu'
      );
      return;
    }

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === "accepted") {
      setDeferredPrompt(null);
      setIsInstallable(false);
    }
  };

  return (
    <main className="relative min-h-screen bg-linear-to-br from-green-100 via-green-50 to-white overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute top-20 right-20 w-20 h-20 bg-purple-200 rounded-full opacity-40 blur-2xl" />
      <div className="absolute bottom-40 left-10 w-32 h-32 bg-blue-200 rounded-full opacity-30 blur-3xl" />

      {/* Main content container */}
      <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 py-12 sm:py-16 lg:py-20">
        {/* Navigation header */}
        <header className="flex items-center justify-between mb-16 sm:mb-20">
          <div className="text-xl sm:text-2xl font-bold text-[#002F6D] flex gap-2">
            <Image
              src="/logo.png"
              alt="Ramblee Logo"
              width={269.8}
              height={236.1}
              className="grow-0 shrink-0 h-[calc(236.1px/8)] w-[calc(269.8px/8)]"
            />
            <span>ramblee</span>
          </div>
          <button
            onClick={handleInstallClick}
            className="px-6 py-2.5 border-2 border-gray-300 text-gray-700 font-semibold rounded-full hover:border-[#002F6D] hover:text-[#002F6D] transition-all duration-300"
          >
            Install Ramblee
          </button>
        </header>

        {/* Hero grid */}
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left: Text content */}
          <div className="space-y-8">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight">
              A <span className="font-playfair-display italic">fun</span> way to
              learn
              <br />
              <span className="font-playfair-display italic">complex</span>{" "}
              stuff
            </h1>

            <p className="text-lg sm:text-xl text-gray-600 max-w-lg leading-relaxed">
              Short lessons, clear ideas, no intimidation.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-4">
              {!isInstalled ? (
                <button
                  onClick={handleInstallClick}
                  className="group relative px-8 py-4 bg-[#0067ED] text-white font-semibold rounded-full overflow-hidden transition-all duration-300 hover:shadow-[0_8px_24px_rgba(0,103,237,0.4)] hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-2"
                >
                  <span className="absolute inset-0 bg-white/20 rounded-full scale-0 group-hover:scale-[3] transition-transform duration-500" />
                  <span className="relative z-10">Install Ramblee</span>
                </button>
              ) : (
                <Link
                  href="/auth"
                  className="group relative px-8 py-4 bg-[#0067ED] text-white font-semibold rounded-full overflow-hidden transition-all duration-300 hover:shadow-[0_8px_24px_rgba(0,103,237,0.4)] hover:-translate-y-0.5 active:translate-y-0"
                >
                  <span className="absolute inset-0 bg-white/20 rounded-full scale-0 group-hover:scale-[3] transition-transform duration-500" />
                  <span className="relative z-10">Get Started</span>
                </Link>
              )}

              <Link href="/auth" className="px-8 py-4 bg-transparent text-gray-700 font-semibold rounded-full border-2 border-gray-300 transition-all duration-300 hover:bg-gray-50 hover:border-gray-400 hover:-translate-y-0.5 active:translate-y-0">
                Login
              </Link>
            </div>

            {/* Stats */}
          </div>

          {/* Right: Colorful image cards */}
          <div className="relative hidden lg:block">
            {/* Decorative shapes - hidden on mobile for cleaner look */}
            <div className="hidden lg:block absolute top-8 left-12 w-16 h-16 bg-blue-300 rounded-full opacity-60" />
            <div className="hidden lg:block absolute bottom-20 right-8 w-12 h-12 bg-purple-300 rounded-full opacity-60" />
            <div className="absolute top-1/2 right-1/4 text-4xl"></div>
            <div className="absolute bottom-1/3 left-8 text-3xl"></div>

            {/* Image cards grid - responsive */}
            <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Card 1 - Sky blue */}
              <div className="group relative overflow-hidden rounded-3xl bg-linear-to-br from-sky-300 to-sky-400 h-48 sm:h-56 lg:h-64 shadow-lg transform hover:scale-105 transition-transform duration-300">
                <Image
                  src="/girl-with-phone.png"
                  alt="Girl with phone"
                  fill
                  className="object-cover transition-transform duration-700 ease-out group-hover:scale-110"
                />
              </div>

              {/* Card 2 - Purple */}
              <div className="group relative overflow-hidden rounded-3xl bg-linear-to-br from-purple-300 to-purple-400 h-48 sm:h-56 lg:h-64 shadow-lg transform hover:scale-105 transition-transform duration-300 sm:mt-12">
                <Image
                  src="/boy-holding-phone.png"
                  alt="Boy holding phone"
                  fill
                  className="object-cover -scale-x-100 transition-transform duration-700 ease-out group-hover:scale-110 group-hover:-scale-x-110"
                />
              </div>

              {/* Card 3 - Green/Orange blend */}
              <div className="group relative overflow-hidden rounded-3xl bg-linear-to-br from-green-300 to-green-400 h-48 sm:h-56 lg:h-64 shadow-lg transform hover:scale-105 transition-transform duration-300 sm:col-span-2 mt-4">
                <Image
                  src="/two-friends.png"
                  alt="Two friends"
                  fill
                  className="object-cover transition-transform duration-700 ease-out scale-110 group-hover:scale-125"
                />
              </div>
            </div>

            {/* Floating decorative ring - hidden on mobile */}
            <div className="hidden lg:block absolute top-20 -right-8 w-24 h-24 border-4 border-purple-200 rounded-full opacity-50" />
          </div>
        </div>
      </div>

      {/* Trust line at bottom */}
      <div className="absolute bottom-8 left-0 right-0 text-center">
        <p className="text-sm text-gray-400 italic">
          No hype. No jargon. Just understanding.
        </p>
      </div>
    </main>
  );
}
