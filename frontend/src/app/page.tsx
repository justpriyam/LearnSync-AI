"use client";

import React, { useState, useEffect, useRef } from "react";
import { ChevronDown, Menu, X } from "lucide-react";

/* ─── constants ──────────────────────────────────────────────── */
const VIDEO_SRC =
  "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260803_192301_9231ed6b-c55c-4a48-909c-4ebe11cf2e11.mp4";

const NAV_LINKS = [
  { label: "Modules", hasChevron: false },
  { label: "Clientele", hasChevron: false },
  { label: "Solutions", hasChevron: true },
  { label: "Billing", hasChevron: false },
];

const CTA_GRADIENT = "linear-gradient(to bottom, #2B2B2B, #101010)";

/* ─── Logo SVG ───────────────────────────────────────────────── */
function LogoIcon({ className }: { className?: string }) {
  return (
    <svg
      width={24}
      height={24}
      viewBox="0 0 256 256"
      className={className}
      fill="currentColor"
    >
      <path d="M 128 128 C 128 198.692 70.692 256 0 256 C 0 185.308 57.308 128 128 128 Z M 128 128 C 198.692 128 256 185.308 256 256 C 185.308 256 128 198.692 128 128 Z M 0 0 C 70.692 0 128 57.308 128 128 C 57.308 128 0 70.692 0 0 Z M 256 0 C 256 70.692 198.692 128 128 128 C 128 57.308 185.308 0 256 0 Z" />
    </svg>
  );
}

/* ─── Component ──────────────────────────────────────────────── */
export default function NexumHero() {
  const [menuOpen, setMenuOpen] = useState(false);
  const prevOverflow = useRef("");

  /* body scroll lock */
  useEffect(() => {
    if (menuOpen) {
      prevOverflow.current = document.body.style.overflow;
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = prevOverflow.current;
    }
    return () => {
      document.body.style.overflow = prevOverflow.current;
    };
  }, [menuOpen]);

  return (
    <section className="relative h-screen w-full overflow-hidden">
      {/* ── background video ─────────────────────────────────── */}
      <video
        className="absolute inset-0 h-full w-full object-cover"
        src={VIDEO_SRC}
        autoPlay
        loop
        muted
        playsInline
      />

      {/* ── content layer ────────────────────────────────────── */}
      <div className="relative z-10 flex h-full flex-col">
        {/* ─── NAVBAR ────────────────────────────────────────── */}
        <nav className="flex w-full items-center justify-between px-5 py-5 sm:px-8 sm:py-6 lg:px-12">
          {/* logo */}
          <div className="flex items-center gap-2">
            <LogoIcon className="text-[#010101] lg:text-white" />
            <span className="text-lg font-semibold text-[#010101] lg:text-white">
              nexum
            </span>
          </div>

          {/* desktop nav */}
          <div className="hidden items-center gap-3 md:flex">
            {/* glass pill cluster */}
            <div className="flex items-center gap-1 rounded-full bg-white/10 px-1.5 py-1.5 backdrop-blur-lg">
              {NAV_LINKS.map((link) => (
                <button
                  key={link.label}
                  className="flex items-center gap-1 rounded-full px-4 py-1.5 text-sm font-medium text-white/80 transition-colors hover:bg-white/10 hover:text-white"
                >
                  {link.label}
                  {link.hasChevron && (
                    <ChevronDown className="h-3.5 w-3.5" />
                  )}
                </button>
              ))}
            </div>

            {/* CTA pill */}
            <button
              className="self-stretch rounded-full px-5 text-sm font-medium text-white hover:opacity-90 transition-opacity"
              style={{ background: CTA_GRADIENT }}
            >
              Get started
            </button>
          </div>

          {/* mobile hamburger */}
          <button
            onClick={() => setMenuOpen((p) => !p)}
            className="relative z-50 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 backdrop-blur-lg md:hidden"
            aria-label="Toggle menu"
          >
            <Menu
              className={`absolute h-5 w-5 text-[#010101] lg:text-white transition-all duration-300 ${
                menuOpen
                  ? "rotate-90 scale-0 opacity-0"
                  : "rotate-0 scale-100 opacity-100"
              }`}
            />
            <X
              className={`absolute h-5 w-5 text-[#010101] lg:text-white transition-all duration-300 ${
                menuOpen
                  ? "rotate-0 scale-100 opacity-100"
                  : "-rotate-90 scale-0 opacity-0"
              }`}
            />
          </button>
        </nav>

        {/* ─── MOBILE MENU OVERLAY ───────────────────────────── */}
        {/* backdrop */}
        <div
          className={`fixed inset-0 z-40 bg-black/80 backdrop-blur-md transition-opacity duration-300 md:hidden ${
            menuOpen
              ? "opacity-100"
              : "pointer-events-none opacity-0"
          }`}
          onClick={() => setMenuOpen(false)}
        />

        {/* drawer panel */}
        <div
          className={`fixed right-0 top-0 z-40 flex h-full w-72 flex-col bg-black/90 backdrop-blur-xl transition-transform duration-500 md:hidden ${
            menuOpen ? "translate-x-0" : "translate-x-full"
          }`}
          style={{
            transitionTimingFunction: "cubic-bezier(0.16, 1, 0.3, 1)",
          }}
        >
          {/* links */}
          <div className="flex flex-col gap-2 px-6 pt-24">
            {NAV_LINKS.map((link, i) => (
              <button
                key={link.label}
                className="flex items-center justify-between rounded-xl px-4 py-3.5 text-base font-medium text-white/80 transition-colors hover:bg-white/10 hover:text-white"
                style={{
                  opacity: menuOpen ? 1 : 0,
                  transform: menuOpen
                    ? "translateX(0)"
                    : "translateX(24px)",
                  transition: `opacity 300ms ease ${
                    (i + 1) * 60
                  }ms, transform 300ms ease ${(i + 1) * 60}ms`,
                }}
              >
                {link.label}
                {link.hasChevron && (
                  <ChevronDown className="h-4 w-4" />
                )}
              </button>
            ))}
          </div>

          {/* bottom CTA */}
          <div className="mt-auto px-6 pb-10">
            <button
              className="w-full rounded-full px-5 py-3 text-sm font-medium text-white hover:opacity-90 transition-opacity"
              style={{
                background: CTA_GRADIENT,
                opacity: menuOpen ? 1 : 0,
                transform: menuOpen
                  ? "translateY(0)"
                  : "translateY(16px)",
                transition:
                  "opacity 400ms ease 300ms, transform 400ms ease 300ms",
              }}
            >
              Get started
            </button>
          </div>
        </div>

        {/* ─── HERO CONTENT (bottom-anchored) ────────────────── */}
        <div className="mt-auto flex flex-col gap-6 px-5 pb-8 sm:gap-8 sm:px-8 sm:pb-12 lg:flex-row lg:items-end lg:justify-between lg:px-12 lg:pb-16">
          {/* left: headline + email CTA */}
          <div className="max-w-xl">
            <h1 className="text-3xl font-semibold leading-[1.1] tracking-tight text-[#010101] sm:text-4xl lg:text-[3.5rem] lg:text-white">
              Ship AI workers that grind while you rest
            </h1>

            {/* email CTA */}
            <div className="mt-6 sm:mt-8">
              {/* mobile: stacked */}
              <div className="flex flex-col gap-3 sm:hidden">
                <input
                  type="email"
                  placeholder="Type your email"
                  className="rounded-full bg-white px-5 py-3 text-sm text-gray-900 placeholder-gray-400 outline-none"
                />
                <button
                  className="rounded-full px-6 py-3 text-sm font-medium text-white hover:opacity-90 transition-opacity"
                  style={{ background: CTA_GRADIENT }}
                >
                  Get started
                </button>
              </div>

              {/* sm+: inline capsule */}
              <div className="hidden sm:inline-flex sm:flex-row sm:items-center sm:rounded-full sm:bg-white sm:p-1.5">
                <input
                  type="email"
                  placeholder="Type your email"
                  className="w-64 rounded-none bg-transparent px-4 py-2 text-sm text-gray-900 placeholder-gray-400 outline-none"
                />
                <button
                  className="rounded-full px-6 py-2.5 text-sm font-medium text-white hover:opacity-90 transition-opacity"
                  style={{ background: CTA_GRADIENT }}
                >
                  Get started
                </button>
              </div>
            </div>
          </div>

          {/* right: two glass cards */}
          <div className="flex w-full flex-col gap-4 sm:flex-row lg:w-auto lg:gap-5">
            {/* Stats card */}
            <div className="flex flex-col justify-between rounded-2xl bg-white/10 p-5 backdrop-blur-lg sm:w-64 sm:p-6">
              <span
                className="text-3xl font-normal tracking-tight text-[#010101] sm:text-4xl lg:text-white"
                style={{ fontFamily: "'Silkscreen', cursive" }}
              >
                42,500+
              </span>
              <p className="mt-3 text-sm leading-relaxed text-[#010101]/70 sm:mt-4 lg:text-white/70">
                Teams run Nexum to handle recurring ops daily.
              </p>
            </div>

            {/* Testimonial card */}
            <div className="rounded-2xl bg-white/10 p-5 backdrop-blur-lg sm:w-64 sm:p-6">
              {/* header */}
              <div className="mb-3 flex items-center gap-2 sm:mb-4">
                <div className="flex h-6 w-6 items-center justify-center rounded bg-black">
                  <span className="text-xs font-bold text-white">S</span>
                </div>
                <span className="text-sm font-semibold text-[#010101] lg:text-white">
                  Stratify
                </span>
              </div>

              {/* quote */}
              <p className="text-sm leading-relaxed text-[#010101]/80 lg:text-white/80">
                &ldquo;With Nexum we went from managing tedious operational work
                to having AI agents that handle everything.&rdquo;
              </p>

              {/* footer */}
              <div className="mt-4 flex items-center gap-3 sm:mt-5">
                <img
                  src="https://i.pravatar.cc/72?img=12"
                  alt="Sara Klein"
                  className="h-9 w-9 rounded-full object-cover bg-white/20"
                />
                <div>
                  <p className="text-sm font-semibold text-[#010101] lg:text-white">
                    Sara Klein
                  </p>
                  <p className="text-xs text-[#010101]/60 lg:text-white/60">
                    Dir of Operations
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
