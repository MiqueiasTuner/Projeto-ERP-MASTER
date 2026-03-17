
import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Globe, ShieldCheck, Zap, Info, ExternalLink, CheckCircle2, MessageSquare } from 'lucide-react';

const IntegrationsPage: React.FC = () => {
  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-3 text-orange-600">
            <Globe size={24} strokeWidth={2.5} />
            <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tighter italic">Hub de Multivenda</h1>
            <span className="bg-orange-500 text-white text-[8px] font-black uppercase tracking-[0.2em] px-2 py-0.5 rounded-full">
              Em Breve
            </span>
          </div>
          <p className="text-[11px] text-[var(--text-muted)] font-medium max-w-xl">
            Integração direta com portais imobiliários em fase de homologação técnica.
          </p>
        </div>
        
        <div className="flex items-center space-x-2 bg-orange-500/5 p-3 rounded-2xl border border-orange-500/10">
          <Info size={14} className="text-orange-500" />
          <div className="flex flex-col">
            <span className="text-[9px] font-black text-orange-600 uppercase tracking-widest">Status da Homologação</span>
            <div className="flex items-center gap-2">
              <div className="w-24 h-1.5 bg-[var(--bg-card-alt)] rounded-full overflow-hidden">
                <div className="h-full bg-orange-500 w-[65%]" />
              </div>
              <span className="text-[9px] font-bold text-orange-600">65%</span>
            </div>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main Content Area - OTIMIZADA */}
        <section className="lg:col-span-3 space-y-6">
          <div className="bg-[var(--bg-card)] p-6 rounded-[32px] border border-[var(--border)] border-dashed flex flex-col items-center justify-center text-center space-y-3 min-h-[200px]">
            <div className="w-12 h-12 bg-orange-500/10 text-orange-600 rounded-xl flex items-center justify-center">
              <Zap size={24} />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-black text-[var(--text-main)] italic tracking-tight">Módulo em Desenvolvimento</h3>
              <p className="text-[10px] text-[var(--text-muted)] font-medium max-w-sm mx-auto">
                Homologação da API V2 da OLX em andamento.
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-2 pt-1">
              {['Sincronização', 'Leads', 'Slots'].map((tag) => (
                <div key={tag} className="flex items-center space-x-1.5 text-[8px] font-black text-orange-600 uppercase tracking-widest bg-orange-500/5 px-2 py-1 rounded-lg border border-orange-500/10">
                  <CheckCircle2 size={10} />
                  <span>{tag}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Sidebar - Support */}
        <aside className="space-y-6">
          <div className="bg-orange-600 p-6 rounded-[32px] text-white space-y-5 shadow-lg shadow-orange-600/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <MessageSquare size={20} />
              </div>
              <h3 className="font-black text-lg italic tracking-tighter">Suporte Técnico</h3>
            </div>
            
            <p className="text-[11px] font-medium opacity-90 leading-relaxed">
              Fale com o responsável para saber sobre o cronograma de liberação.
            </p>
            
            <div className="space-y-3">
              <div className="bg-white/10 p-3 rounded-xl border border-white/10">
                <span className="block text-[8px] font-black uppercase tracking-widest opacity-60 mb-0.5">Responsável</span>
                <span className="text-xs font-black">Miqueias Soares</span>
              </div>
              <a 
                href="https://wa.me/5562992699910" 
                target="_blank" 
                rel="noopener noreferrer"
                className="w-full bg-white text-orange-600 py-3 rounded-xl font-black text-[9px] uppercase tracking-widest transition-transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center space-x-2"
              >
                <span>WhatsApp</span>
                <ExternalLink size={12} />
              </a>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default IntegrationsPage;
