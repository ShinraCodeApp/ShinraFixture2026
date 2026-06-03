'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

const WC_START = new Date('2026-06-11T16:00:00Z');

function getTimeLeft() {
  const diff = WC_START.getTime() - Date.now();
  if (diff <= 0) return null;
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  const seconds = Math.floor((diff % 60000) / 1000);
  return { days, hours, minutes, seconds };
}

function TimeUnit({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <div className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-3 min-w-[70px] text-center border border-white/20">
        <span className="text-3xl md:text-4xl font-black text-white tabular-nums">
          {String(value).padStart(2, '0')}
        </span>
      </div>
      <span className="text-xs text-white/60 mt-1 uppercase tracking-wider font-medium">{label}</span>
    </div>
  );
}

export function CountdownHero() {
  const [timeLeft, setTimeLeft] = useState(getTimeLeft);
  const started = timeLeft === null;

  useEffect(() => {
    if (started) return;
    const id = setInterval(() => setTimeLeft(getTimeLeft()), 1000);
    return () => clearInterval(id);
  }, [started]);

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-[#001489] via-[#1565C0] to-[#0D47A1] text-white py-16 md:py-24">
      {/* Background decoration */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-white rounded-full filter blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-yellow-400 rounded-full filter blur-3xl" />
      </div>

      <div className="relative container mx-auto px-4 text-center">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-1.5 mb-6">
            <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
            <span className="text-sm font-medium text-white/90">FIFA World Cup 2026™</span>
          </div>

          <h1 className="text-5xl md:text-7xl font-black mb-3 tracking-tight">
            ShinraFixture
          </h1>
          <p className="text-lg md:text-xl text-white/70 mb-10">
            {started
              ? 'El Mundial está en curso. ¡Haz tus pronósticos!'
              : 'Pronósticos, estadísticas y más del Mundial USA · Canadá · México'}
          </p>
        </motion.div>

        {!started && timeLeft && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="flex flex-col items-center gap-4"
          >
            <p className="text-white/60 text-sm uppercase tracking-widest font-medium">
              El torneo comienza en
            </p>
            <div className="flex items-end gap-3">
              <TimeUnit value={timeLeft.days} label="días" />
              <span className="text-3xl font-black text-white/40 mb-3">:</span>
              <TimeUnit value={timeLeft.hours} label="horas" />
              <span className="text-3xl font-black text-white/40 mb-3">:</span>
              <TimeUnit value={timeLeft.minutes} label="min" />
              <span className="text-3xl font-black text-white/40 mb-3">:</span>
              <TimeUnit value={timeLeft.seconds} label="seg" />
            </div>
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="flex flex-wrap justify-center gap-4 mt-10"
        >
          <a
            href="/fixture"
            className="bg-white text-[#001489] font-bold px-6 py-3 rounded-xl hover:bg-white/90 transition-colors"
          >
            Ver Fixture
          </a>
          <a
            href="/predictions"
            className="bg-yellow-400 text-black font-bold px-6 py-3 rounded-xl hover:bg-yellow-300 transition-colors"
          >
            Pronosticar
          </a>
        </motion.div>
      </div>
    </section>
  );
}
