"use client";

import { motion } from "framer-motion";
import { User, Tag, ChevronLeft, ChevronRight, Edit, Trash2, Loader2, Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { deleteTalent, toggleTalentStatus } from "@/app/admin/talents/add/actions";
import { useRouter } from "next/navigation";
import { useToast } from "@/lib/toast";
import { useConfirm } from "@/lib/confirm";
import { cn } from "@/lib/utils";

interface Talent {
    id: string;
    nombre: string;
    genero: string;
    altura: string;
    experiencia: string;
    especialidad: string;
    descripcion: string;
    fotos: string[];
    tags: string[];
    active: boolean;
}

interface TalentCardProps {
    talent: Talent;
}

export default function TalentCard({ talent }: TalentCardProps) {
    const router = useRouter();
    const { success, error: toastError } = useToast();
    const { confirm } = useConfirm();
    const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isTogglingStatus, setIsTogglingStatus] = useState(false);
    const photos = talent.fotos && talent.fotos.length > 0 ? talent.fotos : ["/placeholder-avatar.png"];

    const nextPhoto = () => {
        setCurrentPhotoIndex((prev) => (prev + 1) % photos.length);
    };

    const prevPhoto = () => {
        setCurrentPhotoIndex((prev) => (prev - 1 + photos.length) % photos.length);
    };

    const handleToggleStatus = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        setIsTogglingStatus(true);
        try {
            const result = await toggleTalentStatus(talent.id, talent.active);
            if (result.success) {
                success(`${talent.nombre} ahora está ${!talent.active ? "Activo" : "Inactivo"}.`);
                router.refresh();
            } else {
                toastError(`Error al cambiar estado: ${result.error}`);
            }
        } catch (error) {
            console.error("Toggle status error:", error);
            toastError("Ocurrió un error inesperado.");
        } finally {
            setIsTogglingStatus(false);
        }
    };

    const handleDelete = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        const confirmed = await confirm({
            title: "¿Eliminar talento?",
            message: `¿Estás seguro de que deseas eliminar a ${talent.nombre}? Esta acción no se puede deshacer.`,
            confirmText: "Eliminar",
            cancelText: "Cancelar",
            variant: "danger"
        });

        if (confirmed) {
            setIsDeleting(true);
            try {
                const result = await deleteTalent(talent.id);
                if (result.success) {
                    success(`${talent.nombre} ha sido eliminado.`);
                    router.refresh();
                } else {
                    toastError(`Error al eliminar: ${result.error}`);
                }
            } catch (error) {
                console.error("Delete error:", error);
                toastError("Ocurrió un error inesperado al eliminar.");
            } finally {
                setIsDeleting(false);
            }
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative glass rounded-2xl overflow-hidden border border-white/10 hover:border-blue-500/30 transition-all group"
        >
            {/* Photo Gallery */}
            <div className={cn(
                "relative aspect-[3/4] bg-gradient-to-br from-blue-600/10 to-indigo-600/10 overflow-hidden transition-all duration-500",
                !talent.active && "grayscale opacity-60"
            )}>
                <Image
                    src={photos[currentPhotoIndex]}
                    alt={talent.nombre}
                    fill
                    className="object-cover"
                />

                {/* Status Indicator Badge */}
                <div className="absolute top-4 left-4 z-40">
                    <div className={cn(
                        "flex items-center gap-2 px-3 py-1.5 rounded-full backdrop-blur-md border text-[10px] font-black uppercase tracking-widest transition-all",
                        talent.active
                            ? "bg-green-500/20 text-green-400 border-green-500/30"
                            : "bg-gray-500/20 text-gray-400 border-gray-500/30"
                    )}>
                        <span className={cn(
                            "w-1.5 h-1.5 rounded-full",
                            talent.active ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)] animate-pulse" : "bg-gray-500"
                        )} />
                        {talent.active ? "Disponible" : "No Disponible"}
                    </div>
                </div>

                {/* Photo Navigation */}
                {photos.length > 1 && (
                    <>
                        <button
                            onClick={prevPhoto}
                            className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 backdrop-blur-sm text-white p-2 rounded-full opacity-100 lg:opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/70"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        <button
                            onClick={nextPhoto}
                            className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 backdrop-blur-sm text-white p-2 rounded-full opacity-100 lg:opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/70"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>

                        {/* Photo Indicators */}
                        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                            {photos.map((_, index) => (
                                <button
                                    key={index}
                                    onClick={() => setCurrentPhotoIndex(index)}
                                    className={`w-1.5 h-1.5 rounded-full transition-all ${index === currentPhotoIndex
                                        ? "bg-white w-4"
                                        : "bg-white/50 hover:bg-white/75"
                                        }`}
                                />
                            ))}
                        </div>

                    </>
                )}
            </div>

            {/* Action Buttons (Top Right) */}
            <div className="absolute top-4 right-4 z-50 flex flex-col gap-3 transition-all duration-300">
                <button
                    onClick={handleToggleStatus}
                    disabled={isTogglingStatus}
                    className={cn(
                        "backdrop-blur-md text-white/80 hover:text-white p-2 rounded-full transition-all disabled:opacity-50",
                        talent.active ? "bg-amber-500/40 hover:bg-amber-500/60" : "bg-blue-500/40 hover:bg-blue-500/60"
                    )}
                    title={talent.active ? "Desactivar Talento" : "Activar Talento"}
                >
                    {isTogglingStatus ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                    ) : talent.active ? (
                        <EyeOff className="w-4 h-4" />
                    ) : (
                        <Eye className="w-4 h-4" />
                    )}
                </button>
                <Link
                    href={`/admin/talents/${talent.id}/edit`}
                    className="bg-black/40 hover:bg-black/60 backdrop-blur-md text-white/80 hover:text-white p-2 rounded-full transition-all"
                    title="Editar Talento"
                >
                    <Edit className="w-4 h-4" />
                </Link>
                <button
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="bg-red-500/40 hover:bg-red-500/60 backdrop-blur-md text-white/80 hover:text-white p-2 rounded-full transition-all disabled:opacity-50"
                    title="Eliminar Talento"
                >
                    {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                </button>
            </div>

            {/* Content */}
            <div className={cn("p-5 space-y-3 transition-opacity", !talent.active && "opacity-50")}>
                {/* Name & Gender */}
                <div>
                    <h3 className="text-xl font-bold tracking-tight">{talent.nombre}</h3>
                    <div className="flex items-center gap-2 text-sm text-gray-400 mt-1">
                        <User className="w-4 h-4" />
                        <span>{talent.genero}</span>
                        {talent.altura && (
                            <>
                                <span>•</span>
                                <span>{talent.altura}</span>
                            </>
                        )}
                    </div>
                </div>

                {/* Specialty & Experience */}
                <div className="flex gap-2 flex-wrap">
                    {talent.especialidad && (
                        <span className="px-3 py-1 bg-blue-500/10 text-blue-400 rounded-lg text-xs font-medium border border-blue-500/20">
                            {talent.especialidad}
                        </span>
                    )}
                    {talent.experiencia && (
                        <span className="px-3 py-1 bg-indigo-500/10 text-indigo-400 rounded-lg text-xs font-medium border border-indigo-500/20">
                            {talent.experiencia}
                        </span>
                    )}
                </div>

                {/* Description */}
                {talent.descripcion && (
                    <p className="text-sm text-gray-400 line-clamp-2">
                        {talent.descripcion}
                    </p>
                )}

                {/* Tags */}
                {talent.tags && talent.tags.length > 0 && (
                    <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-white/5">
                        <Tag className="w-3.5 h-3.5 text-gray-500" />
                        {talent.tags.slice(0, 3).map((tag, index) => (
                            <span
                                key={index}
                                className="text-xs text-gray-500 bg-white/5 px-2 py-0.5 rounded"
                            >
                                {tag}
                            </span>
                        ))}
                        {talent.tags.length > 3 && (
                            <span className="text-xs text-gray-500">
                                +{talent.tags.length - 3}
                            </span>
                        )}
                    </div>
                )}
            </div>
        </motion.div >
    );
}
