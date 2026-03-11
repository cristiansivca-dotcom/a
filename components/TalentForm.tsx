"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { CheckCircle2, AlertCircle, ArrowLeft, Loader2, AlertTriangle, X, UserPlus } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { useToast } from "@/lib/toast";
import Image from "next/image";

interface TalentData {
    id?: string;
    nombre: string;
    genero: string;
    altura: string;
    experiencia: string;
    especialidad: string;
    descripcion: string;
    tags: string[];
    rating: number;
    fotos: string[];
}

export interface TalentSubmissionData {
    nombre: string;
    genero: string;
    altura: string;
    experiencia: string;
    especialidad: string;
    descripcion: string;
    rating: string;
    fotosFiles: File[];
    existingPhotos: string[];
    tags: string[];
}

interface TalentFormProps {
    initialData?: TalentData;
    mode: "add" | "edit";
    onSubmit: (data: TalentSubmissionData) => Promise<{ success: boolean; error?: string }>;
}

export default function TalentForm({ initialData, mode, onSubmit }: TalentFormProps) {
    const router = useRouter();
    const { success, error: toastError } = useToast();
    const [formData, setFormData] = useState({
        nombre: initialData?.nombre || "",
        genero: initialData?.genero || "Dama",
        altura: initialData?.altura || "",
        experiencia: initialData?.experiencia || "",
        especialidad: initialData?.especialidad || "",
        descripcion: initialData?.descripcion || "",
        tags: initialData?.tags?.join(", ") || "",
        rating: initialData?.rating?.toString() || ""
    });
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState<"success" | "error" | null>(null);
    const [touched, setTouched] = useState<Record<string, boolean>>({});
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [files, setFiles] = useState<File[]>([]);
    const [existingPhotos, setExistingPhotos] = useState<string[]>(initialData?.fotos || []);
    const [serverError, setServerError] = useState<string | null>(null);

    // Validation function
    const validateField = (name: string, value: string | File[]) => {
        let error = "";

        switch (name) {
            case "nombre":
                if (!value || (typeof value === "string" && value.trim().length < 3)) {
                    error = "El nombre debe tener al menos 3 caracteres";
                }
                break; // Missing break fixed
            case "altura":
                if (value && typeof value === "string" && !/^\d+(\.\d+)?\s*(m|cm)?$/i.test(value.trim())) {
                    error = "Formato inválido (ej: 1.75m o 175cm)";
                }
                break;
            case "files":
                // If editing, we consider existing photos too
                const totalPhotos = (Array.isArray(value) ? value.length : 0) + existingPhotos.length;
                if (totalPhotos === 0) {
                    error = "Debes agregar al menos una foto";
                }
                break;
            case "rating":
                if (value && (isNaN(Number(value)) || Number(value) < 0 || Number(value) > 5)) {
                    error = "El rating debe ser entre 0 y 5";
                }
                break;
        }

        return error;
    };

    const handleBlur = (name: string) => {
        setTouched({ ...touched, [name]: true });
        const error = validateField(name, formData[name as keyof typeof formData]);
        setErrors({ ...errors, [name]: error });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setStatus(null);

        // Validate all fields
        const newErrors: Record<string, string> = {};
        Object.keys(formData).forEach(key => {
            const error = validateField(key, formData[key as keyof typeof formData]);
            if (error) newErrors[key] = error;
        });
        // Validar archivos
        const filesError = validateField("files", files);
        if (filesError) newErrors["files"] = filesError;

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            setTouched(Object.keys(formData).reduce((acc, key) => ({ ...acc, [key]: true }), {}));
            setLoading(false);
            setStatus("error");
            return;
        }

        const dataToSend = {
            ...formData,
            fotosFiles: files,
            existingPhotos: existingPhotos, // Send existing photos to keep
            tags: formData.tags.split(",").map((t: string) => t.trim()).filter(Boolean)
        };

        try {
            const result = await onSubmit(dataToSend);
            if (result.success) {
                success(mode === "add" ? "Talento registrado correctamente" : "Talento actualizado correctamente");
                setStatus("success");
                setServerError(null);
                if (mode === "add") {
                    setFormData({
                        nombre: "",
                        genero: "Dama",
                        altura: "",
                        experiencia: "",
                        especialidad: "",
                        descripcion: "",
                        tags: "",
                        rating: ""
                    });
                    setFiles([]);
                    setExistingPhotos([]);
                    setTouched({});
                    setErrors({});
                } else {
                    // Small delay to let the toast be seen
                    setTimeout(() => {
                        router.push("/admin/talents");
                        router.refresh();
                    }, 800);
                }
            } else {
                console.error("submit error:", result.error);
                setServerError(result.error ?? "Error desconocido en el servidor");
                toastError(result.error ?? "Error al procesar el talento");
                setStatus("error");
            }
        } catch (error: unknown) {
            console.error(error);
            setServerError(error instanceof Error ? error.message : String(error));
            toastError("Error inesperado en el sistema");
            setStatus("error");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-5xl mx-auto space-y-10">
            <div className="flex items-center justify-between">
                <div>
                    <Link href="/admin/talents" className="flex items-center gap-2 text-gray-500 hover:text-white transition-colors text-xs font-bold uppercase tracking-widest mb-4 group">
                        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                        Volver al Catálogo
                    </Link>
                    <h1 className="text-4xl font-black tracking-tighter text-gradient leading-tight">
                        {mode === "add" ? "Registrar Nuevo Talento" : "Editar Talento"}
                    </h1>
                    <p className="text-gray-400 mt-1 font-medium italic">
                        {mode === "add" ? "Expande el alcance de la agencia SIVCA." : "Actualiza la información del talento."}
                    </p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                <div className="lg:col-span-2 space-y-8">
                    <section className="glass p-10 rounded-[2.5rem] border border-white/5 space-y-8 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-10 opacity-5 pointer-events-none">
                            <UserPlus size={180} />
                        </div>

                        <div className="space-y-6 relative z-10">
                            <h2 className="text-xl font-black tracking-tight flex items-center gap-3">
                                <span className="w-2 h-2 bg-blue-500 rounded-full shadow-[0_0_15px_rgba(59,130,246,0.5)]" />
                                Perfil Identitario
                            </h2>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-gray-500 uppercase tracking-widest ml-1">Nombre Artístico / Completo</label>
                                    <motion.div
                                        animate={touched.nombre && errors.nombre ? { x: [0, -10, 10, -10, 10, 0] } : { x: 0 }}
                                        transition={{ duration: 0.4 }}
                                    >
                                        <Input
                                            value={formData.nombre}
                                            onChange={e => {
                                                setFormData({ ...formData, nombre: e.target.value });
                                                if (touched.nombre) {
                                                    const error = validateField("nombre", e.target.value);
                                                    setErrors({ ...errors, nombre: error });
                                                }
                                            }}
                                            onBlur={() => handleBlur("nombre")}
                                            placeholder="Ej. Isabella Rodríguez"
                                            className={cn(
                                                "bg-white/[0.03] border-white/5 focus:bg-white/[0.07] transition-all",
                                                touched.nombre && errors.nombre && "border-red-500/50 bg-red-500/5 shadow-[0_0_15px_rgba(239,68,68,0.1)]",
                                                touched.nombre && !errors.nombre && formData.nombre && "border-green-500/50 bg-green-500/5"
                                            )}
                                        />
                                    </motion.div>
                                    <AnimatePresence>
                                        {touched.nombre && errors.nombre && (
                                            <motion.div
                                                initial={{ opacity: 0, y: -10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: -10 }}
                                                className="flex items-center gap-2 text-xs text-red-400 bg-red-500/10 px-3 py-2 rounded-lg border border-red-500/20"
                                            >
                                                <AlertTriangle className="w-3.5 h-3.5" />
                                                {errors.nombre}
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-xs font-black text-gray-500 uppercase tracking-widest ml-1">Género</label>
                                        <select
                                            className="w-full bg-white/[0.03] border border-white/5 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500/50 focus:bg-white/[0.07] transition-all appearance-none font-medium"
                                            value={formData.genero}
                                            onChange={e => setFormData({ ...formData, genero: e.target.value })}
                                        >
                                            <option value="Dama">Dama</option>
                                            <option value="Caballero">Caballero</option>
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-black text-gray-500 uppercase tracking-widest ml-1">Estatura</label>
                                        <motion.div
                                            animate={touched.altura && errors.altura ? { x: [0, -10, 10, -10, 10, 0] } : { x: 0 }}
                                            transition={{ duration: 0.4 }}
                                        >
                                            <Input
                                                value={formData.altura}
                                                onChange={e => {
                                                    setFormData({ ...formData, altura: e.target.value });
                                                    if (touched.altura) {
                                                        const error = validateField("altura", e.target.value);
                                                        setErrors({ ...errors, altura: error });
                                                    }
                                                }}
                                                onBlur={() => handleBlur("altura")}
                                                placeholder="1.78 m"
                                                className={cn(
                                                    "bg-white/[0.03] border-white/5 text-center",
                                                    touched.altura && errors.altura && "border-red-500/50 bg-red-500/5 shadow-[0_0_15px_rgba(239,68,68,0.1)]",
                                                    touched.altura && !errors.altura && formData.altura && "border-green-500/50 bg-green-500/5"
                                                )}
                                            />
                                        </motion.div>
                                        <AnimatePresence>
                                            {touched.altura && errors.altura && (
                                                <motion.div
                                                    initial={{ opacity: 0, y: -10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    exit={{ opacity: 0, y: -10 }}
                                                    className="flex items-center gap-2 text-xs text-red-400 bg-red-500/10 px-3 py-2 rounded-lg border border-red-500/20"
                                                >
                                                    <AlertTriangle className="w-3.5 h-3.5" />
                                                    {errors.altura}
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-black text-gray-500 uppercase tracking-widest ml-1">Descripción de Trayectoria</label>
                                <textarea
                                    className="w-full bg-white/[0.03] border border-white/5 rounded-2xl px-5 py-4 text-white outline-none focus:border-blue-500/50 focus:bg-white/[0.07] transition-all min-h-[160px] resize-none font-medium leading-relaxed"
                                    value={formData.descripcion}
                                    onChange={e => setFormData({ ...formData, descripcion: e.target.value })}
                                    placeholder="Describe la experiencia, estudios y aptitudes del talento..."
                                />
                            </div>
                        </div>
                    </section>

                    <section className="glass p-10 rounded-[2.5rem] border border-white/5 space-y-8">
                        <h2 className="text-xl font-black tracking-tight flex items-center gap-3">
                            <span className="w-2 h-2 bg-indigo-500 rounded-full shadow-[0_0_15px_rgba(99,102,241,0.5)]" />
                            Expertise y Tags
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-xs font-black text-gray-500 uppercase tracking-widest ml-1">Experiencia (Años)</label>
                                <Input
                                    value={formData.experiencia}
                                    onChange={e => setFormData({ ...formData, experiencia: e.target.value })}
                                    placeholder="Ej. 2 años"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-black text-gray-500 uppercase tracking-widest ml-1">Rating (0-5)</label>
                                <motion.div
                                    animate={touched.rating && errors.rating ? { x: [0, -10, 10, -10, 10, 0] } : { x: 0 }}
                                    transition={{ duration: 0.4 }}
                                >
                                    <Input
                                        type="number"
                                        min="0"
                                        max="5"
                                        step="0.1"
                                        value={formData.rating}
                                        onChange={e => {
                                            setFormData({ ...formData, rating: e.target.value });
                                            if (touched.rating) {
                                                const error = validateField("rating", e.target.value);
                                                setErrors({ ...errors, rating: error });
                                            }
                                        }}
                                        onBlur={() => handleBlur("rating")}
                                        placeholder="5.0"
                                        className={cn(
                                            "bg-white/[0.03] border-white/5",
                                            touched.rating && errors.rating && "border-red-500/50 bg-red-500/5 shadow-[0_0_15px_rgba(239,68,68,0.1)]",
                                            touched.rating && !errors.rating && formData.rating && "border-green-500/50 bg-green-500/5"
                                        )}
                                    />
                                </motion.div>
                                <AnimatePresence>
                                    {touched.rating && errors.rating && (
                                        <motion.div
                                            initial={{ opacity: 0, y: -10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -10 }}
                                            className="flex items-center gap-2 text-xs text-red-400 bg-red-500/10 px-3 py-2 rounded-lg border border-red-500/20"
                                        >
                                            <AlertTriangle className="w-3.5 h-3.5" />
                                            {errors.rating}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-black text-gray-500 uppercase tracking-widest ml-1">Especialidad Principal</label>
                                <Input
                                    value={formData.especialidad}
                                    onChange={e => setFormData({ ...formData, especialidad: e.target.value })}
                                    placeholder="Ej. Pasarela / Fotografía"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-black text-gray-500 uppercase tracking-widest ml-1">Etiquetas (Separar por coma)</label>
                                <Input
                                    value={formData.tags}
                                    onChange={e => setFormData({ ...formData, tags: e.target.value })}
                                    placeholder="Fashion, TV, Eventos"
                                />
                            </div>
                        </div>
                    </section>
                </div>

                <div className="space-y-8">
                    <section className="glass p-8 rounded-[2.5rem] border border-white/5 space-y-6 sticky top-28">
                        <h2 className="text-lg font-black tracking-tight flex items-center gap-2">
                            Visual Center
                        </h2>

                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-xs font-black text-gray-500 uppercase tracking-widest ml-1">Subir Fotos</label>
                                <motion.div
                                    animate={touched.files && errors.files ? { x: [0, -10, 10, -10, 10, 0] } : { x: 0 }}
                                    transition={{ duration: 0.4 }}
                                    className={cn(
                                        "p-4 rounded-2xl border transition-all",
                                        touched.files && errors.files ? "border-red-500/50 bg-red-500/5 shadow-[0_0_15px_rgba(239,68,68,0.1)]" : "border-white/5 bg-white/[0.03]"
                                    )}
                                >
                                    <input
                                        type="file"
                                        accept="image/*"
                                        multiple
                                        onChange={e => {
                                            const selected = Array.from(e.target.files || []);
                                            setFiles(prev => [...prev, ...selected]);
                                            if (touched.files) {
                                                const error = validateField("files", [...files, ...selected]);
                                                setErrors({ ...errors, files: error });
                                            }
                                            e.target.value = "";
                                        }}
                                        className="w-full text-xs text-white/80 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-blue-600/10 file:text-blue-500 hover:file:bg-blue-600/20 transition-all pointer-events-auto cursor-pointer"
                                    />
                                </motion.div>
                                <AnimatePresence>
                                    {touched.files && errors.files && (
                                        <motion.div
                                            initial={{ opacity: 0, y: -10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -10 }}
                                            className="flex items-center gap-2 text-xs text-red-400 bg-red-500/10 px-3 py-2 rounded-lg border border-red-500/20"
                                        >
                                            <AlertTriangle className="w-3.5 h-3.5" />
                                            {errors.files}
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                {/* New Files Preview */}
                                {files.length > 0 && (
                                    <div className="grid grid-cols-4 gap-2 mt-2">
                                        {files.map((f, i) => (
                                            <div key={`new-${i}`} className="relative group">
                                                <Image src={URL.createObjectURL(f)} alt={f.name} width={200} height={200} className="w-full h-20 object-cover rounded-lg" unoptimized />
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const newFiles = files.filter((_, index) => index !== i);
                                                        setFiles(newFiles);
                                                        if (touched.files) {
                                                            setErrors({ ...errors, files: validateField("files", newFiles) });
                                                        }
                                                    }}
                                                    className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-1 opacity-100 lg:opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                    <X className="w-3 h-3" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Existing Photos Preview (Edit Mode) */}
                                {existingPhotos.length > 0 && (
                                    <div className="mt-4">
                                        <label className="text-xs font-black text-gray-500 uppercase tracking-widest ml-1 mb-2 block">Fotos Existentes</label>
                                        <div className="grid grid-cols-4 gap-2">
                                            {existingPhotos.map((url, i) => (
                                                <div key={`existing-${i}`} className="relative group">
                                                    <Image src={url} alt="Existing" width={200} height={200} className="w-full h-20 object-cover rounded-lg" unoptimized />
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            const newExisting = existingPhotos.filter((_, index) => index !== i);
                                                            setExistingPhotos(newExisting);
                                                            if (touched.files) {
                                                                // Re-validate total count
                                                                setErrors({ ...errors, files: validateField("files", files) });
                                                            }
                                                        }}
                                                        className="absolute top-1 right-1 bg-red-500/80 text-white rounded-full p-1 opacity-100 lg:opacity-0 group-hover:opacity-100 transition-opacity"
                                                    >
                                                        <X className="w-3 h-3" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="pt-4 space-y-4">
                            <Button
                                type="submit"
                                className="w-full py-5 text-sm font-black uppercase tracking-widest"
                                disabled={loading}
                            >
                                {loading ? (
                                    <div className="flex items-center gap-2">
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Procesando...
                                    </div>
                                ) : (mode === "add" ? "Confirmar Registro" : "Guardar Cambios")}
                            </Button>

                            <AnimatePresence>
                                {status && (
                                    <motion.div
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, scale: 0.95 }}
                                        className={cn(
                                            "p-4 rounded-2xl flex flex-col gap-3 border",
                                            status === "success"
                                                ? "bg-green-500/10 text-green-500 border-green-500/20"
                                                : "bg-red-500/10 text-red-500 border-red-500/20"
                                        )}
                                    >
                                        <div className="flex items-center gap-3">
                                            {status === "success" ? <CheckCircle2 className="w-5 h-5 flex-shrink-0" /> : <AlertCircle className="w-5 h-5 flex-shrink-0" />}
                                            <span className="text-[10px] font-black uppercase tracking-tight">
                                                {status === "success"
                                                    ? (mode === "add" ? "Talento registrado correctamente" : "Talento actualizado correctamente")
                                                    : "Error crítico en el enlace de datos"}
                                            </span>
                                        </div>
                                        {serverError && (
                                            <div className="text-[10px] font-medium text-red-300 bg-red-500/5 px-3 py-2 rounded-lg border border-red-500/10">
                                                {serverError}
                                            </div>
                                        )}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </section>
                </div>
            </form>
        </div>
    );
}
