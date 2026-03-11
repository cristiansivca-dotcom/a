"use client";

import React, { createContext, useContext, useState, useCallback, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, X } from "lucide-react";

interface ConfirmOptions {
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    variant?: "danger" | "info";
}

interface ConfirmContextType {
    confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextType | undefined>(undefined);

export const useConfirm = () => {
    const context = useContext(ConfirmContext);
    if (!context) {
        throw new Error("useConfirm must be used within a ConfirmProvider");
    }
    return context;
};

export const ConfirmProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [config, setConfig] = useState<ConfirmOptions | null>(null);
    const resolveRef = useRef<((value: boolean) => void) | null>(null);

    const confirm = useCallback((options: ConfirmOptions) => {
        return new Promise<boolean>((resolve) => {
            setConfig(options);
            resolveRef.current = resolve;
        });
    }, []);

    const handleCancel = () => {
        if (resolveRef.current) resolveRef.current(false);
        setConfig(null);
    };

    const handleConfirm = () => {
        if (resolveRef.current) resolveRef.current(true);
        setConfig(null);
    };

    return (
        <ConfirmContext.Provider value={{ confirm }}>
            {children}
            <AnimatePresence>
                {config && (
                    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={handleCancel}
                            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="relative w-full max-w-md glass border border-white/10 rounded-3xl overflow-hidden shadow-2xl"
                        >
                            <div className="p-6 pt-8 text-center">
                                <div className={`w-16 h-16 rounded-full mx-auto mb-6 flex items-center justify-center ${config.variant === "danger"
                                    ? "bg-red-500/20 text-red-500 border border-red-500/20"
                                    : "bg-blue-500/20 text-blue-500 border border-blue-500/20"
                                    }`}>
                                    <AlertTriangle className="w-8 h-8" />
                                </div>

                                <h3 className="text-2xl font-bold mb-2 text-white">{config.title}</h3>
                                <p className="text-gray-400 mb-8">{config.message}</p>

                                <div className="flex gap-3">
                                    <button
                                        onClick={handleCancel}
                                        className="flex-1 px-6 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white font-medium transition-all"
                                    >
                                        {config.cancelText || "Cancelar"}
                                    </button>
                                    <button
                                        onClick={handleConfirm}
                                        className={`flex-1 px-6 py-3 rounded-xl font-bold text-white transition-all shadow-lg ${config.variant === "danger"
                                            ? "bg-gradient-to-r from-red-600 to-rose-600 hover:shadow-red-500/30"
                                            : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:shadow-blue-500/30"
                                            }`}
                                    >
                                        {config.confirmText || "Confirmar"}
                                    </button>
                                </div>
                            </div>

                            <button
                                onClick={handleCancel}
                                className="absolute top-4 right-4 p-2 text-gray-500 hover:text-white transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </ConfirmContext.Provider>
    );
};
