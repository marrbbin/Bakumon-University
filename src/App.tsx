/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AuthProvider } from './context/AuthContext';
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
