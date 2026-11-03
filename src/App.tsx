/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { CurriculumSection } from './components/CurriculumSection';
import { StudentTerminal } from './components/StudentTerminal';
import { AdminRoster } from './components/AdminRoster';
import { AboutSection } from './components/AboutSection';
import { Footer } from './components/Footer';
import { SupabaseSetupModal } from './components/SupabaseSetupModal';
import { Enrollee } from './types';

function MainApp() {
  const [isSupabaseSetupOpen, setIsSupabaseSetupOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const { role, user, switchSimulatedRole } = useAuth();

  const handleGoToEnrollment = () => {
    const terminalEl = document.getElementById('terminal');
    if (terminalEl) {
      terminalEl.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleEnrollmentComplete = (_newEnrollee: Enrollee) => {
    setRefreshTrigger((prev) => prev + 1);
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 flex flex-col font-sans selection:bg-rose-500 selection:text-white">
      {/* Top Navigation */}
      <Navbar onOpenSupabaseSetup={() => setIsSupabaseSetupOpen(true)} />

      {/* RBAC Quick Banner */}
      <aside aria-label="Role Status" className="bg-slate-100 border-b border-slate-300 py-1.5 px-4 text-xs font-mono text-slate-700">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-900">ACTIVE SESSION:</span>
            <span
              className={`px-2 py-0.5 text-[10px] font-pixel border border-slate-900 ${
                role === 'admin'
                  ? 'bg-amber-300 text-slate-900'
                  : role === 'student'
                  ? 'bg-emerald-200 text-emerald-950'
                  : 'bg-slate-300 text-slate-800'
              }`}
            >
              {role.toUpperCase()} ROLE
            </span>
            <span className="text-slate-500 hidden sm:inline">
              {user ? `@${user.username}` : 'Not logged in (Guest)'}
            </span>
          </div>

          <div className="flex items-center gap-2 text-[11px]">
            <span className="text-slate-500 hidden md:inline">Test RBAC Views:</span>
            <button
              onClick={() => switchSimulatedRole('student')}
              className={`px-2 py-0.5 border border-slate-900 cursor-pointer ${
                role === 'student' ? 'bg-emerald-600 text-white font-bold' : 'bg-white hover:bg-slate-50'
              }`}
            >
              Student View
            </button>
            <button
              onClick={() => switchSimulatedRole('admin')}
              className={`px-2 py-0.5 border border-slate-900 cursor-pointer ${
                role === 'admin' ? 'bg-amber-500 text-slate-950 font-bold' : 'bg-white hover:bg-slate-50'
              }`}
            >
              Admin View
            </button>
            <button
              onClick={() => switchSimulatedRole('guest')}
              className={`px-2 py-0.5 border border-slate-900 cursor-pointer ${
                role === 'guest' ? 'bg-slate-800 text-white font-bold' : 'bg-white hover:bg-slate-50'
              }`}
            >
              Guest (Locked)
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Sections */}
      <main className="flex-1">
        {/* Hero Section with Prominent "Login with Discord" CTA & Campus View */}
        <Hero onOpenSupabaseSetup={() => setIsSupabaseSetupOpen(true)} />

        {/* The 4 Core Subjects within the Single Major */}
        <CurriculumSection onGoToEnrollment={handleGoToEnrollment} />

        {/* Student Terminal (Student Role Only) - Handles INSERT & Duplicate Prevention */}
        <StudentTerminal
          onEnrollmentComplete={handleEnrollmentComplete}
          onOpenSupabaseSetup={() => setIsSupabaseSetupOpen(true)}
        />

        {/* Admin Roster (Admin Role Only) - Handles SELECT and programmatic DELETE */}
        <AdminRoster
          onOpenSupabaseSetup={() => setIsSupabaseSetupOpen(true)}
          refreshTrigger={refreshTrigger}
        />

        {/* Campus Lore & Student Conduct */}
        <AboutSection />
      </main>

      {/* Footer */}
      <Footer />

      {/* Supabase, PostgreSQL Schema, and Discord RBAC Setup Modal */}
      <SupabaseSetupModal
        isOpen={isSupabaseSetupOpen}
        onClose={() => setIsSupabaseSetupOpen(false)}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
