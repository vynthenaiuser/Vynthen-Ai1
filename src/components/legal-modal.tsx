'use client';

import { useState } from 'react';
import { X, FileText, Shield, Briefcase } from 'lucide-react';

type LegalTab = 'terms' | 'privacy' | 'license';

interface LegalModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialTab?: LegalTab;
}

const TERMS_OF_SERVICE = `
VYNTHEN AI – TERMS OF SERVICE

Effective Date: February 22, 2026
Last Updated: February 22, 2026

1. ACCEPTANCE OF TERMS

By accessing, registering for, or using Vynthen AI ("Service"), you agree to be legally bound by these Terms. If you do not agree, you must not use the Service.

2. DESCRIPTION OF SERVICE

Vynthen AI provides artificial intelligence systems capable of generating text, images, code, audio, and other outputs using proprietary infrastructure and models.

We reserve the right to modify, suspend, or discontinue any aspect of the Service at any time without prior notice.

3. ELIGIBILITY

You must be legally capable of entering into binding agreements under applicable law.

4. USER OBLIGATIONS

You agree not to:
• Use the Service for unlawful purposes
• Generate harmful, fraudulent, abusive, or deceptive content
• Attempt to extract model weights, architecture, or proprietary logic
• Reverse engineer, decompile, or disassemble any system
• Circumvent security, rate limits, or usage restrictions
• Use automated scraping tools without authorization

Violation may result in immediate termination without notice.

5. AI OUTPUT DISCLAIMER

Outputs are generated algorithmically. Vynthen AI does not guarantee:
• Accuracy
• Reliability
• Non-infringement
• Fitness for any specific purpose

Users assume full responsibility for use of outputs.

6. SUSPENSION AND TERMINATION

We may suspend or permanently terminate accounts at our sole discretion for violations, abuse, or risk to platform integrity.

7. LIMITATION OF LIABILITY

To the maximum extent permitted by law, Vynthen AI shall not be liable for:
• Indirect or consequential damages
• Lost revenue or data
• Business interruption
• Reliance on AI-generated outputs

Total liability shall not exceed the amount paid by the user in the preceding 12 months.

8. CHANGES TO TERMS

We may modify these Terms at any time. Continued use constitutes acceptance.
`;

const PRIVACY_POLICY = `
VYNTHEN AI – PRIVACY POLICY

Effective Date: February 22, 2026

1. INFORMATION WE COLLECT

We may collect:
• Account details (email, username)
• Usage data and interaction logs
• Device and browser metadata
• Payment information (processed by third-party providers)

2. HOW WE USE INFORMATION

We use collected information to:
• Provide and improve the Service
• Ensure system security
• Enforce our policies
• Comply with legal obligations

3. DATA RETENTION

We retain data as long as necessary to:
• Maintain system integrity
• Improve AI systems
• Comply with legal requirements

4. DATA SHARING

We do not sell personal data.

We may share information with:
• Infrastructure providers
• Payment processors
• Legal authorities when required

5. SECURITY

We implement industry-standard security measures but cannot guarantee absolute security.

6. YOUR RIGHTS

Users may request access, correction, or deletion of personal data where legally applicable.
`;

const LICENSE_AGREEMENT = `
VYNTHEN AI – PROPRIETARY LICENSE AGREEMENT

Effective Date: February 22, 2026

This License governs all access to and use of Vynthen AI.

1. OWNERSHIP OF PLATFORM

All rights, title, and interest in and to:
• Vynthen AI systems
• Model architectures
• Prompt engineering frameworks
• UI/UX design
• Branding, logos, and trademarks
• APIs, endpoints, and orchestration logic
• Optimization methods and safety systems

are the exclusive property of Vynthen AI.

No ownership rights are transferred to users.

2. OWNERSHIP OF AI OUTPUTS

Unless otherwise specified by paid enterprise agreement:

Vynthen AI retains a perpetual, worldwide, irrevocable, royalty-free license to use, reproduce, modify, adapt, train on, analyze, and commercialize all user inputs and generated outputs.

Users are granted a limited, non-exclusive, revocable license to use generated outputs for lawful purposes.

Vynthen AI reserves the right to:
• Reuse generated outputs
• Incorporate outputs into future models
• Use interaction data for training and optimization

3. REVERSE ENGINEERING PROHIBITION

Users may not:
• Attempt to replicate model behavior
• Benchmark competitively for model extraction
• Conduct systematic output harvesting
• Perform adversarial prompt attacks
• Extract embeddings, vectors, or system weights

Violation constitutes intellectual property infringement.

4. DERIVATIVE SYSTEM RESTRICTION

Users may not use Vynthen AI to:
• Build competing AI systems
• Train derivative foundation models
• Replicate core system architecture
• Develop similar commercial AI services

5. ENFORCEMENT

Unauthorized use may result in:
• Immediate account termination
• Legal action
• Financial damages
• Injunctive relief

6. RESERVATION OF RIGHTS

All rights not expressly granted are reserved by Vynthen AI.
`;

export function LegalModal({ open, onOpenChange, initialTab = 'terms' }: LegalModalProps) {
  const [activeTab, setActiveTab] = useState<LegalTab>(initialTab);

  if (!open) return null;

  const getContent = () => {
    switch (activeTab) {
      case 'terms':
        return TERMS_OF_SERVICE;
      case 'privacy':
        return PRIVACY_POLICY;
      case 'license':
        return LICENSE_AGREEMENT;
    }
  };

  const tabs: { id: LegalTab; label: string; icon: any }[] = [
    { id: 'terms', label: 'Terms of Service', icon: FileText },
    { id: 'privacy', label: 'Privacy Policy', icon: Shield },
    { id: 'license', label: 'License Agreement', icon: Briefcase },
  ];

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/90 backdrop-blur-sm"
        onClick={() => onOpenChange(false)}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-3xl max-h-[85vh] mx-4 bg-[#0a0a0a] border border-[#1f1f1f] rounded-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#1f1f1f]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8">
              <img
                src="/upload/Vynthen.jpg"
                alt="Vynthen"
                className="w-full h-full object-contain"
              />
            </div>
            <span className="text-lg font-medium text-[#f2f2f2]">Legal Documents</span>
          </div>
          <button 
            onClick={() => onOpenChange(false)}
            className="p-2 rounded-lg text-[#9ca3af] hover:text-[#f2f2f2] hover:bg-[#1a1a1a] transition-surface"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Tabs */}
        <div className="flex border-b border-[#1f1f1f] overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm whitespace-nowrap transition-surface ${
                  activeTab === tab.id
                    ? 'text-[#f2f2f2] border-b-2 border-[#f2f2f2]'
                    : 'text-[#9ca3af] hover:text-[#f2f2f2]'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <pre className="whitespace-pre-wrap text-sm text-[#d4d4d4] font-mono leading-relaxed">
            {getContent()}
          </pre>
        </div>
        
        {/* Footer */}
        <div className="p-4 border-t border-[#1f1f1f]">
          <button
            onClick={() => onOpenChange(false)}
            className="w-full bg-[#f2f2f2] text-[#000000] rounded-xl py-2.5 text-sm font-medium hover:bg-[#e5e5e5] transition-surface"
          >
            I Understand
          </button>
        </div>
      </div>
    </div>
  );
}
