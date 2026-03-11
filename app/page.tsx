"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Sparkles, ArrowRight, Users, TrendingUp, Shield } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import AnimatedBackground from "@/components/AnimatedBackground";

export default function HomePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkUser() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        const role = user.user_metadata?.role;

        if (!role || role === 'pending') {
          router.push("/pending");
        } else if (role === 'inventario') {
          router.push("/admin/inventory");
        } else if (role === 'catalogo') {
          router.push("/admin/talents");
        } else {
          router.push("/admin");
        }
      } else {
        setLoading(false);
      }
    }
    checkUser();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#050505]">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center animate-pulse">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <span className="text-xl font-bold text-gradient">Cargando...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden bg-[#050505]">
      {/* Premium Animated Background */}
      <AnimatedBackground />

      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="text-center max-w-4xl mx-auto"
        >
          {/* SIVCA Logo */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="flex flex-col items-center justify-center gap-6 mb-12"
          >
            <div className="w-28 h-28 bg-white/5 rounded-[2rem] flex items-center justify-center shadow-2xl shadow-blue-500/20 border border-white/10 overflow-hidden backdrop-blur-xl group hover:shadow-blue-500/40 transition-all duration-500 p-4">
              <Image
                src="/logo_sivca.png"
                alt="SIVCA Logo"
                width={80}
                height={80}
                className="object-contain group-hover:scale-110 transition-transform duration-500"
              />
            </div>
            <span className="text-xl font-bold tracking-[0.2em] text-gray-400 uppercase">Administración</span>
          </motion.div>

          {/* Hero Text */}
          <h1 className="text-5xl md:text-7xl font-bold mb-6 tracking-tight">
            Gestiona tu Catálogo
            <br />
            <span className="text-gradient">de Talento</span>
          </h1>
          <p className="text-xl text-gray-400 mb-12 max-w-2xl mx-auto">
            Plataforma moderna para administrar y mostrar tu portafolio de talentos con estilo profesional
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <Link href="/login">
              <button className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl px-8 py-4 font-medium hover:shadow-lg hover:shadow-blue-500/30 transition-all flex items-center justify-center gap-2 group">
                Iniciar Sesión
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
            </Link>
          </div>

          {/* Features */}
          <div className="grid md:grid-cols-3 gap-6 max-w-3xl mx-auto relative z-20">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="glass rounded-2xl p-6 border border-white/10 backdrop-blur-md hover:bg-white/5 transition-colors"
            >
              <Users className="w-8 h-8 text-blue-400 mb-4 mx-auto" />
              <h3 className="font-bold mb-2 text-white">Gestión de Talento</h3>
              <p className="text-sm text-gray-400">Control maestro sobre perfiles y catálogos interactivos</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="glass rounded-2xl p-6 border border-white/10 backdrop-blur-md hover:bg-white/5 transition-colors"
            >
              <TrendingUp className="w-8 h-8 text-indigo-400 mb-4 mx-auto" />
              <h3 className="font-bold mb-2 text-white">Dashboard Analítico</h3>
              <p className="text-sm text-gray-400">Datos e historial de transacciones en tiempo real</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="glass rounded-2xl p-6 border border-white/10 backdrop-blur-md hover:bg-white/5 transition-colors"
            >
              <Shield className="w-8 h-8 text-purple-400 mb-4 mx-auto" />
              <h3 className="font-bold mb-2 text-white">Seguridad Empresarial</h3>
              <p className="text-sm text-gray-400">Accesos encriptados con monitoreo constante</p>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
