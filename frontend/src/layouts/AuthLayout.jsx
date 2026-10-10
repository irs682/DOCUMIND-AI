import React from 'react';
import { Link, Outlet } from 'react-router-dom';
import { ArrowUpRight, FileSearch, ShieldCheck, Sparkles, Sun, Moon } from 'lucide-react';
import { useThemeContext } from '../context/ThemeContext';

const AuthLayout = () => {
  const { theme, toggleTheme } = useThemeContext();

  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-950 px-4 py-5 sm:px-6 sm:py-8 flex items-center justify-center">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_14%,rgba(99,102,241,0.34),transparent_30%),radial-gradient(circle_at_88%_88%,rgba(20,184,166,0.2),transparent_27%)]" />

      {/* Floating Theme Switcher at Top Right */}
      <div className="absolute top-4 right-4 z-20">
        <button
          type="button"
          onClick={toggleTheme}
          className="p-2.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition-colors shadow-lg flex items-center gap-2 text-xs font-semibold"
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode`}
        >
          {theme === 'dark' ? (
            <>
              <Sun size={16} className="text-amber-400" />
              <span className="hidden sm:inline">Light</span>
            </>
          ) : (
            <>
              <Moon size={16} className="text-indigo-400" />
              <span className="hidden sm:inline">Dark</span>
            </>
          )}
        </button>
      </div>

      <div className="relative mx-auto grid min-h-[calc(100vh-2.5rem)] w-full max-w-6xl overflow-hidden rounded-[2rem] border border-white/10 bg-white dark:bg-slate-900 shadow-2xl lg:grid-cols-[1.05fr_0.95fr]">
        {/* Left Brand Panel */}
        <section className="hidden flex-col justify-between bg-slate-950 p-10 text-white lg:flex">
          <Link to="/" className="inline-flex items-center gap-3 text-lg font-bold tracking-tight">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-indigo-400 to-cyan-300 text-slate-950">
              <FileSearch size={21} />
            </span>
            DOCUMIND<span className="text-cyan-300">.AI</span>
          </Link>

          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-cyan-200">
              <Sparkles size={14} /> Intelligent workspace
            </span>
            <h1 className="mt-6 max-w-md text-4xl font-semibold leading-tight tracking-tight">
              Turn every document into your team’s advantage.
            </h1>
            <p className="mt-5 max-w-md text-sm leading-6 text-slate-300">
              Search, understand, and act on company knowledge from one secure, AI-powered workspace.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <ShieldCheck className="mb-3 text-emerald-300" size={20} />
              <p className="font-semibold">Enterprise secure</p>
              <p className="mt-1 text-xs text-slate-400">Protected by design</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <ArrowUpRight className="mb-3 text-cyan-300" size={20} />
              <p className="font-semibold">Fast by default</p>
              <p className="mt-1 text-xs text-slate-400">Built for focus</p>
            </div>
          </div>
        </section>

        {/* Right Form Panel */}
        <section className="flex min-h-full items-center bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 p-6 sm:p-10 lg:p-12 transition-colors">
          <div className="mx-auto w-full max-w-md">
            <div className="mb-10 flex items-center justify-between lg:hidden">
              <Link to="/" className="inline-flex items-center gap-2 font-bold text-slate-950 dark:text-slate-100">
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-indigo-600 text-white">
                  <FileSearch size={17} />
                </span>
                DOCUMIND.AI
              </Link>
              <Link to="/" className="text-sm font-semibold text-slate-500 dark:text-slate-400 hover:text-indigo-600">
                Back home
              </Link>
            </div>
            <Outlet />
          </div>
        </section>
      </div>
    </main>
  );
};

export default AuthLayout;
