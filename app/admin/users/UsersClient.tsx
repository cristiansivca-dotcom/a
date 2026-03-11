"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Users, Shield, ShieldCheck, Mail, ShieldAlert, Edit2, Check, X, Trash2, ArrowLeft, Ban, CheckCircle2, Clock, UserPlus } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { updateUser, deleteUser, toggleUserBlock, createUser } from "./actions";
import { useToast } from "@/lib/toast";
import { useConfirm } from "@/lib/confirm";

type User = {
    id: string;
    email: string;
    name: string;
    role: string;
    created_at: string;
    blocked?: boolean;
    avatar_url?: string | null;
};

export default function UsersClient({ initialUsers }: { initialUsers: User[] }) {
    const { success, error: toastError } = useToast();
    const { confirm } = useConfirm();

    const [users, setUsers] = useState<User[]>(initialUsers);
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState<"Todos" | "Activos" | "Pendientes" | "Bloqueados">("Todos");

    // Edit Modal State
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [editForm, setEditForm] = useState({ name: "", email: "", role: "" });
    const [isUpdating, setIsUpdating] = useState(false);

    const [loading, setLoading] = useState<string | null>(null);

    const [showCreateModal, setShowCreateModal] = useState(false);
    const [isCreating, setIsCreating] = useState(false);

    const filteredUsers = users.filter(u => {
        const matchesSearch = u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
            u.role.toLowerCase().includes(searchQuery.toLowerCase());

        const matchesStatus =
            statusFilter === "Todos" ? true :
                statusFilter === "Activos" ? !u.blocked && u.role !== 'pending' :
                    statusFilter === "Pendientes" ? u.role === 'pending' :
                        statusFilter === "Bloqueados" ? !!u.blocked : true;

        return matchesSearch && matchesStatus;
    });

    const categories = ["Todos", "Pendientes", "Activos", "Bloqueados"] as const;

    const startEditing = (user: User) => {
        setEditingUser(user);
        setEditForm({ name: user.name, email: user.email, role: user.role });
    };

    const handleUpdateUser = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!editingUser) return;

        setIsUpdating(true);
        const result = await updateUser(editingUser.id, editForm.name, editForm.email, editForm.role);

        if (result.success) {
            success("Usuario actualizado con éxito.");
            setUsers(users.map(u => u.id === editingUser.id ? {
                ...u,
                name: editForm.name,
                email: editForm.email,
                role: editForm.role
            } : u));
            setEditingUser(null);
        } else {
            toastError(result.error || "Error al actualizar el usuario");
        }
        setIsUpdating(false);
    };

    const handleCreateSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsCreating(true);
        const formData = new FormData(e.currentTarget);

        // Basic validation
        if (!formData.get("fullName") || !formData.get("email") || !formData.get("password") || !formData.get("role")) {
            toastError("Por favor completa todos los campos.");
            setIsCreating(false);
            return;
        }

        const result = await createUser(formData);

        if (result.success) {
            success("Usuario creado exitosamente. Se le ha enviado un correo de confirmación.");
            setShowCreateModal(false);
            window.location.reload(); // Recargar para obtener el nuevo usuario
        } else {
            toastError(result.error || "Error al crear usuario.");
        }
        setIsCreating(false);
    };

    const handleToggleBlock = async (user: User) => {
        const isBlocking = !user.blocked;
        const confirmed = await confirm({
            title: isBlocking ? "¿Bloquear Usuario?" : "¿Desbloquear Usuario?",
            message: isBlocking
                ? `¿Estás seguro de que deseas bloquear a "${user.name}"? No podrá acceder al sistema hasta que sea desbloqueado.`
                : `¿Estás seguro de que deseas restaurar el acceso para "${user.name}"?`,
            confirmText: isBlocking ? "Bloquear Acceso" : "Restaurar Acceso",
            cancelText: "Cancelar",
            variant: isBlocking ? "danger" : "info"
        });

        if (confirmed) {
            setLoading(user.id);
            const result = await toggleUserBlock(user.id, !!user.blocked);

            if (result.success) {
                success(isBlocking ? "Usuario bloqueado." : "Usuario desbloqueado.");
                setUsers(users.map(u => u.id === user.id ? { ...u, blocked: isBlocking } : u));
            } else {
                toastError("Error: " + result.error);
            }
            setLoading(null);
        }
    };

    const handleDelete = async (user: User) => {
        const confirmed = await confirm({
            title: "¿Eliminar Usuario?",
            message: `¿Estás seguro de que deseas eliminar a "${user.name}" (${user.email})? Le denegará el acceso al sistema permanentemente.`,
            confirmText: "Eliminar Usuario",
            cancelText: "Cancelar",
            variant: "danger"
        });

        if (confirmed) {
            setLoading(user.id);
            const result = await deleteUser(user.id);

            if (result.success) {
                success("Usuario eliminado exitosamente.");
                setUsers(users.filter(u => u.id !== user.id));
            } else {
                toastError("Error al eliminar al usuario: " + result.error);
            }
            setLoading(null);
        }
    };

    return (
        <div className="space-y-8 max-w-5xl mx-auto">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Link href="/admin" className="p-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 transition-colors text-gray-400 hover:text-white">
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <div>
                        <h1 className="text-4xl font-black tracking-tighter text-gradient leading-tight">Usuarios</h1>
                        <p className="text-gray-400 mt-1 font-medium italic">Gestión de accesos y roles del sistema.</p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-4">
                    {/* Status Tabs */}
                    <div className="bg-white/5 p-1 rounded-xl flex items-center border border-white/10 overflow-x-auto custom-scrollbar">
                        {categories.map((category) => (
                            <button
                                key={category}
                                onClick={() => setStatusFilter(category)}
                                className={cn(
                                    "px-4 py-2 rounded-lg text-sm font-medium transition-all relative flex items-center gap-2",
                                    statusFilter === category ? "text-white" : "text-gray-400 hover:text-white"
                                )}
                            >
                                {statusFilter === category && (
                                    <motion.div
                                        layoutId="activeUserFilter"
                                        className="absolute inset-0 bg-white/10 rounded-lg"
                                        initial={false}
                                        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                    />
                                )}
                                <span className="relative z-10 flex items-center gap-1.5">
                                    {category === "Pendientes" && <Clock className={cn("w-3.5 h-3.5", statusFilter === category ? "text-amber-500" : "")} />}
                                    {category === "Bloqueados" && <Ban className={cn("w-3.5 h-3.5", statusFilter === category ? "text-red-500" : "")} />}
                                    {category === "Activos" && <CheckCircle2 className={cn("w-3.5 h-3.5", statusFilter === category ? "text-green-500" : "")} />}
                                    {category}
                                </span>
                            </button>
                        ))}
                    </div>

                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl px-4 py-3 text-sm font-bold shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40 transition-all whitespace-nowrap"
                    >
                        <UserPlus className="w-4 h-4" />
                        Registrar Usuario
                    </button>
                </div>
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass rounded-[2rem] border border-white/5 overflow-hidden p-6"
            >
                {/* Search & Stats */}
                <div className="flex flex-col md:flex-row gap-4 justify-between items-center mb-6">
                    <div className="relative w-full md:w-96">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <div className="w-4 h-4 border-2 border-gray-500 rounded-full border-t-transparent animate-spin opacity-0 transition-opacity" />
                            <Users className="w-5 h-5 text-gray-500 absolute" />
                        </div>
                        <input
                            type="text"
                            placeholder="Buscar por nombre, email o rol..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 pl-12 pr-4 text-sm font-medium focus:border-blue-500/50 outline-none transition-all placeholder:text-gray-600 text-white shadow-inner"
                        />
                    </div>
                    <div className="flex gap-4 text-sm font-bold tracking-widest uppercase">
                        <div className={cn(
                            "px-4 py-2 rounded-xl border flex items-center gap-2 transition-all",
                            users.filter(u => u.role === 'admin').length >= 5
                                ? "bg-amber-500/10 text-amber-500 border-amber-500/20 ring-4 ring-amber-500/5"
                                : "bg-blue-500/10 text-blue-400 border-blue-500/20"
                        )}>
                            <ShieldAlert className="w-4 h-4" />
                            <span>Admins: {users.filter(u => u.role === 'admin').length}/5</span>
                        </div>
                        <div className="px-4 py-2 rounded-xl bg-white/5 text-gray-400 border border-white/10 flex items-center gap-2">
                            <Users className="w-4 h-4" />
                            <span>Total: {users.length}</span>
                        </div>
                    </div>
                </div>

                {/* Users List */}
                <div className="space-y-3">
                    <AnimatePresence>
                        {filteredUsers.length === 0 ? (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="text-center py-12 text-gray-500 font-medium"
                            >
                                No se encontraron usuarios.
                            </motion.div>
                        ) : (
                            filteredUsers.map(user => (
                                <motion.div
                                    key={user.id}
                                    layout
                                    className={cn(
                                        "group flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-2xl border transition-all",
                                        user.role === 'admin'
                                            ? "bg-blue-500/5 hover:bg-blue-500/10 border-blue-500/10 hover:border-blue-500/20"
                                            : "bg-white/[0.01] hover:bg-white/[0.03] border-white/5 hover:border-white/10"
                                    )}
                                >
                                    <div className="flex items-center gap-4 flex-1">
                                        <div className={cn(
                                            "w-12 h-12 rounded-xl flex-shrink-0 relative border overflow-hidden",
                                            user.blocked
                                                ? "bg-red-500/10 border-red-500/20"
                                                : user.role === 'admin'
                                                    ? "bg-blue-500/10 border-blue-500/20"
                                                    : "bg-white/5 border-white/10"
                                        )}>
                                            {user.avatar_url ? (
                                                <Image
                                                    src={user.avatar_url}
                                                    alt={user.name}
                                                    fill
                                                    className="object-cover"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center opacity-40">
                                                    {user.blocked ? <Ban className="w-5 h-5" /> : (user.role === 'admin' ? <ShieldCheck className="w-5 h-5" /> : user.role === 'pending' ? <Clock className="w-5 h-5 text-amber-500" /> : <Shield className="w-5 h-5" />)}
                                                </div>
                                            )}
                                            {user.blocked && (
                                                <div className="absolute top-0.5 right-0.5 w-2 h-2 bg-red-500 rounded-full border border-[#050505]" />
                                            )}
                                        </div>

                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2">
                                                <p className={cn(
                                                    "font-bold text-lg transition-colors",
                                                    user.blocked ? "text-gray-500 line-through" : "text-white group-hover:text-blue-200"
                                                )}>
                                                    {user.name}
                                                </p>
                                                {user.blocked && (
                                                    <span className="text-[10px] font-black uppercase tracking-tighter bg-red-500 text-white px-1.5 py-0.5 rounded leading-none">
                                                        Bloqueado
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                                                <Mail className="w-3.5 h-3.5" />
                                                <span className="truncate">{user.email}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between md:justify-end gap-6 w-full md:w-auto mt-4 md:mt-0 pt-4 md:pt-0 border-t border-white/5 md:border-t-0">

                                        {/* Role Display */}
                                        <div className="flex items-center gap-2">
                                            <span className={cn(
                                                "px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest border transition-colors",
                                                user.blocked ? "bg-red-500/5 text-red-500/50 border-red-500/10" :
                                                    user.role === 'admin' ? "bg-blue-500/20 text-blue-400 border-blue-500/30" :
                                                        user.role === 'inventario' ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                                                            user.role === 'pending' ? "bg-amber-500/10 text-amber-500 border-amber-500/20" :
                                                                "bg-purple-500/10 text-purple-400 border-purple-500/20"
                                            )}>
                                                {user.role === 'pending' ? 'Pendiente' : user.role}
                                            </span>
                                        </div>

                                        {/* Actions */}
                                        <div className="flex items-center gap-2 opacity-100 md:opacity-50 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => handleToggleBlock(user)}
                                                disabled={loading === user.id || user.role === 'admin'}
                                                className={cn(
                                                    "p-2 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed",
                                                    user.blocked
                                                        ? "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
                                                        : "bg-amber-500/10 text-amber-500 hover:bg-amber-500/20"
                                                )}
                                                title={user.blocked ? "Desbloquear Usuario" : "Bloquear Usuario"}
                                            >
                                                {user.blocked ? <CheckCircle2 className="w-4 h-4" /> : <Ban className="w-4 h-4" />}
                                            </button>
                                            <button
                                                onClick={() => startEditing(user)}
                                                disabled={loading === user.id}
                                                className="p-2 bg-blue-500/5 text-blue-400 hover:bg-blue-500/20 rounded-lg transition-colors disabled:opacity-50"
                                                title="Editar Usuario"
                                            >
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(user)}
                                                disabled={loading === user.id || user.role === 'admin'}
                                                className="p-2 bg-red-500/5 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                title="Eliminar Cuenta"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>

                                    </div>
                                </motion.div>
                            ))
                        )}
                    </AnimatePresence>
                </div>
            </motion.div>

            {/* Create User Modal */}
            <AnimatePresence>
                {showCreateModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="glass w-full max-w-md bg-[#0a0a0a] rounded-[2rem] p-8 relative overflow-hidden shadow-2xl border border-white/10"
                        >
                            <button
                                onClick={() => setShowCreateModal(false)}
                                className="absolute top-6 right-6 p-2 rounded-full bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>

                            <h2 className="text-2xl font-black mb-6 text-white flex items-center gap-2">
                                <UserPlus className="text-blue-500" /> Nuevo Usuario
                            </h2>

                            <form onSubmit={handleCreateSubmit} className="space-y-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Nombre Completo</label>
                                    <input name="fullName" type="text" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-blue-500/50 outline-none" required />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Correo Electrónico</label>
                                    <input name="email" type="email" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-blue-500/50 outline-none" required />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Contraseña</label>
                                    <input name="password" type="password" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-blue-500/50 outline-none" required minLength={6} placeholder="Mínimo 6 caracteres" />
                                </div>
                                <div className="space-y-1 pb-4">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Rol Asignado</label>
                                    <select name="role" className="w-full bg-[#111] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-blue-500/50 outline-none font-bold uppercase tracking-widest appearance-none cursor-pointer">
                                        <option value="pending">PENDIENTE</option>
                                        <option value="catalogo">CATALOGO</option>
                                        <option value="inventario">INVENTARIO</option>
                                        <option value="billing">FACTURACIÓN</option>
                                        <option value="admin">ADMIN</option>
                                    </select>
                                </div>

                                <button
                                    type="submit"
                                    disabled={isCreating}
                                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl px-4 py-4 font-bold text-sm shadow-lg hover:shadow-blue-500/40 transition-all disabled:opacity-50"
                                >
                                    {isCreating ? "Creando..." : "Crear Usuario"}
                                </button>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Edit User Modal */}
            <AnimatePresence>
                {editingUser && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
                        onClick={() => !isUpdating && setEditingUser(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 20 }}
                            onClick={e => e.stopPropagation()}
                            className="bg-[#050505] inset-ring inset-ring-white/10 border border-white/10 rounded-[2rem] p-8 max-w-md w-full shadow-2xl relative overflow-hidden"
                        >
                            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500" />

                            <div className="flex justify-between items-start mb-6">
                                <div>
                                    <h2 className="text-2xl font-black text-white tracking-tight">Editar Usuario</h2>
                                    <p className="text-sm text-gray-400">Modifica los datos y rol de este usuario.</p>
                                </div>
                                <button
                                    onClick={() => setEditingUser(null)}
                                    className="text-gray-500 hover:text-white bg-white/5 hover:bg-white/10 p-2 rounded-xl transition-all"
                                    disabled={isUpdating}
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <form onSubmit={handleUpdateUser} className="space-y-5">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-1">Nombre Completo</label>
                                    <div className="relative">
                                        <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                        <input
                                            type="text"
                                            value={editForm.name}
                                            onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                                            className="w-full bg-white/5 border border-white/10 focus:border-blue-500 rounded-xl py-3 pl-10 pr-4 text-white outline-none transition-all placeholder:text-gray-600 font-medium"
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-1">Correo Electrónico</label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                        <input
                                            type="email"
                                            value={editForm.email}
                                            onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                                            className="w-full bg-white/5 border border-white/10 focus:border-blue-500 rounded-xl py-3 pl-10 pr-4 text-white outline-none transition-all placeholder:text-gray-600 font-medium"
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-1">Rol en el Sistema</label>
                                    <div className="relative">
                                        <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                        <select
                                            value={editForm.role}
                                            onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                                            className="w-full bg-white/5 border border-white/10 focus:border-blue-500 rounded-xl py-3 pl-10 pr-4 text-white outline-none transition-all appearance-none font-medium cursor-pointer"
                                            required
                                        >
                                            <option value="pending" className="bg-black">Pendiente (Sin Acceso)</option>
                                            <option value="admin" className="bg-black">Administrador Maestros</option>
                                            <option value="catalogo" className="bg-black">Gestor de Catálogo</option>
                                            <option value="inventario" className="bg-black">Gestor de Inventario</option>
                                            <option value="billing" className="bg-black">Gestor de Facturación</option>
                                        </select>
                                    </div>
                                    {editForm.role === 'admin' && (
                                        <p className="text-[10px] text-amber-500 font-bold px-1 flex items-center gap-1 mt-1">
                                            <ShieldAlert className="w-3 h-3" /> Máximo 5 administradores permitidos.
                                        </p>
                                    )}
                                </div>

                                <div className="pt-2">
                                    <button
                                        type="submit"
                                        disabled={isUpdating}
                                        className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl py-3.5 font-bold shadow-lg shadow-blue-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                    >
                                        {isUpdating ? (
                                            <>
                                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                Actualizando Perfil...
                                            </>
                                        ) : (
                                            <>
                                                <Check className="w-4 h-4" />
                                                Guardar Cambios
                                            </>
                                        )}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
