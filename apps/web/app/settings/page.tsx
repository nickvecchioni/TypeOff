"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { signOut } from "next-auth/react";
import { SignInPrompt } from "@/components/auth/SignInPrompt";
import Link from "next/link";

interface Settings {
  smoothCaret: boolean;
  soundEnabled: boolean;
  soundVolume: number;
  showLiveWpm: boolean;
  showLiveAccuracy: boolean;
  focusMode: boolean;
  stopOnError: "off" | "word" | "letter";
  fontSize: "small" | "medium" | "large";
  freedomMode: boolean;
}

const DEFAULT_SETTINGS: Settings = {
  smoothCaret: true,
  soundEnabled: false,
  soundVolume: 50,
  showLiveWpm: true,
  showLiveAccuracy: true,
  focusMode: true,
  stopOnError: "off",
  fontSize: "medium",
  freedomMode: false,
};

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (status !== "authenticated") return;
    fetch("/api/preferences")
      .then((r) => r.json())
      .then((data) => {
        if (data.settings) {
          setSettings((prev) => ({ ...prev, ...data.settings }));
        }
      })
      .finally(() => setLoading(false));
  }, [status]);

  const save = useCallback(
    async (next: Settings) => {
      setSettings(next);
      setSaving(true);
      setSaved(false);
      try {
        await fetch("/api/preferences", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ settings: next }),
        });
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      } finally {
        setSaving(false);
      }
    },
    []
  );

  const update = useCallback(
    <K extends keyof Settings>(key: K, value: Settings[K]) => {
      const next = { ...settings, [key]: value };
      save(next);
    },
    [settings, save]
  );

  if (status === "loading" || loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
      </div>
    );
  }

  if (!session?.user) {
    return (
      <div className="flex-1 flex items-center justify-center px-4">
        <SignInPrompt message="Sign in to access settings" />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-text">Settings</h1>
          <span
            className={`text-xs font-medium transition-opacity duration-300 ${
              saved ? "text-correct opacity-100" : saving ? "text-muted opacity-100" : "opacity-0"
            }`}
          >
            {saving ? "Saving..." : "Saved"}
          </span>
        </div>

        {/* Typing */}
        <Section title="Typing">
          <Toggle
            label="Smooth caret"
            description="Animate the caret between positions"
            checked={settings.smoothCaret}
            onChange={(v) => update("smoothCaret", v)}
          />
          <div className="flex items-center justify-between py-2.5 gap-4">
            <div className="min-w-0">
              <p className="text-sm text-text">Caret style</p>
              <p className="text-xs text-muted/65">Cursor shape, color, and effects</p>
            </div>
            <Link
              href="/cosmetics"
              className="text-xs text-accent hover:text-accent/80 transition-colors"
            >
              Customize in Cosmetics
            </Link>
          </div>
          <OptionRow
            label="Stop on error"
            description="Prevent advancing past mistakes"
          >
            <SegmentedControl
              options={[
                { value: "off", label: "Off" },
                { value: "word", label: "Word" },
                { value: "letter", label: "Letter" },
              ]}
              value={settings.stopOnError}
              onChange={(v) => update("stopOnError", v as Settings["stopOnError"])}
            />
          </OptionRow>
          <Toggle
            label="Freedom mode"
            description="Allow backspacing across words"
            checked={settings.freedomMode}
            onChange={(v) => update("freedomMode", v)}
          />
        </Section>

        {/* Appearance */}
        <Section title="Appearance">
          <Toggle
            label="Show live WPM"
            description="Display words per minute while typing"
            checked={settings.showLiveWpm}
            onChange={(v) => update("showLiveWpm", v)}
          />
          <Toggle
            label="Show live accuracy"
            description="Display accuracy percentage while typing"
            checked={settings.showLiveAccuracy}
            onChange={(v) => update("showLiveAccuracy", v)}
          />
          <Toggle
            label="Focus mode"
            description="Fade non-essential UI while typing"
            checked={settings.focusMode}
            onChange={(v) => update("focusMode", v)}
          />
          <div className="flex items-center justify-between py-2.5 gap-4">
            <div className="min-w-0">
              <p className="text-sm text-text">Typing theme</p>
              <p className="text-xs text-muted/65">Text colors and visual style</p>
            </div>
            <Link
              href="/cosmetics"
              className="text-xs text-accent hover:text-accent/80 transition-colors"
            >
              Customize in Cosmetics
            </Link>
          </div>
          <OptionRow label="Font size" description="Text size in the typing area">
            <SegmentedControl
              options={[
                { value: "small", label: "Small" },
                { value: "medium", label: "Medium" },
                { value: "large", label: "Large" },
              ]}
              value={settings.fontSize}
              onChange={(v) => update("fontSize", v as Settings["fontSize"])}
            />
          </OptionRow>
        </Section>

        {/* Sound */}
        <Section title="Sound">
          <Toggle
            label="Typing sounds"
            description="Play a sound on each keypress"
            checked={settings.soundEnabled}
            onChange={(v) => update("soundEnabled", v)}
          />
          {settings.soundEnabled && (
            <OptionRow label="Volume" description="Adjust keypress sound volume">
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={settings.soundVolume}
                  onChange={(e) => update("soundVolume", Number(e.target.value))}
                  className="w-28 h-1.5 accent-accent bg-white/[0.08] rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-accent [&::-webkit-slider-thumb]:shadow-[0_0_6px_rgba(77,158,255,0.4)]"
                />
                <span className="text-xs text-muted tabular-nums w-8 text-right">
                  {settings.soundVolume}%
                </span>
              </div>
            </OptionRow>
          )}
        </Section>

        {/* Account */}
        <Section title="Account">
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2">
              <div>
                <p className="text-sm text-text">Profile</p>
                <p className="text-xs text-muted/65">View and share your typing profile</p>
              </div>
              <Link
                href={session.user.username ? `/profile/${session.user.username}` : "#"}
                className="text-sm text-accent hover:text-accent/80 transition-colors"
              >
                View profile
              </Link>
            </div>
            <Divider />
            <div className="flex items-center justify-between py-2">
              <div>
                <p className="text-sm text-text">Cosmetics</p>
                <p className="text-xs text-muted/65">Browse and equip cosmetic items</p>
              </div>
              <Link
                href="/cosmetics"
                className="text-sm text-accent hover:text-accent/80 transition-colors"
              >
                Open shop
              </Link>
            </div>
            <Divider />
            <div className="flex items-center justify-between py-2">
              <div>
                <p className="text-sm text-text">Report a bug</p>
                <p className="text-xs text-muted/65">Help us improve TypeOff</p>
              </div>
              <Link
                href="/bug-report"
                className="text-sm text-accent hover:text-accent/80 transition-colors"
              >
                Report
              </Link>
            </div>
            <Divider />
            <div className="flex items-center justify-between py-2">
              <div>
                <p className="text-sm text-text">Sign out</p>
                <p className="text-xs text-muted/65">
                  Signed in as{" "}
                  <span className="text-muted">{session.user.username || session.user.email}</span>
                </p>
              </div>
              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                className="text-sm text-error/80 hover:text-error transition-colors"
              >
                Sign out
              </button>
            </div>
          </div>
        </Section>

        {/* Danger Zone */}
        <Section title="Danger zone" danger>
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-sm text-text">Reset settings</p>
              <p className="text-xs text-muted/65">Restore all settings to defaults</p>
            </div>
            <button
              onClick={() => {
                if (confirm("Reset all settings to defaults?")) {
                  save(DEFAULT_SETTINGS);
                }
              }}
              className="text-sm text-error/80 hover:text-error transition-colors"
            >
              Reset
            </button>
          </div>
        </Section>

        <div className="h-8" />
      </div>
    </div>
  );
}

/* ── Shared Components ──────────────────────────────────────── */

function Section({
  title,
  danger,
  children,
}: {
  title: string;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section
      className={`rounded-xl border p-5 space-y-1 ${
        danger
          ? "border-error/15 bg-error/[0.03]"
          : "border-white/[0.06] bg-surface/40"
      }`}
    >
      <h2
        className={`text-xs font-semibold uppercase tracking-wider mb-4 ${
          danger ? "text-error/70" : "text-muted/50"
        }`}
      >
        {title}
      </h2>
      {children}
    </section>
  );
}

function Toggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between py-2.5 gap-4">
      <div className="min-w-0">
        <p className="text-sm text-text">{label}</p>
        <p className="text-xs text-muted/65">{description}</p>
      </div>
      <button
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative flex-shrink-0 w-10 h-[22px] rounded-full transition-colors duration-200 ${
          checked ? "bg-accent" : "bg-white/[0.1]"
        }`}
      >
        <span
          className={`absolute top-[3px] left-[3px] w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${
            checked ? "translate-x-[18px]" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );
}

function OptionRow({
  label,
  description,
  children,
}: {
  label: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between py-2.5 gap-4">
      <div className="min-w-0">
        <p className="text-sm text-text">{label}</p>
        <p className="text-xs text-muted/65">{description}</p>
      </div>
      {children}
    </div>
  );
}

function SegmentedControl({
  options,
  value,
  onChange,
}: {
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex rounded-lg bg-white/[0.04] ring-1 ring-white/[0.06] p-0.5">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
            value === opt.value
              ? "bg-accent/15 text-accent shadow-sm"
              : "text-muted/65 hover:text-text"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function Divider() {
  return <div className="border-t border-white/[0.04]" />;
}
