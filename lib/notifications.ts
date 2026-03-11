import { createAdminClient } from "@/lib/supabase/admin";

export type NotificationType = 'info' | 'success' | 'warning' | 'error';

interface CreateNotificationParams {
    title: string;
    message: string;
    type?: NotificationType;
    userId?: string | null;
    role?: string | null;
}

export async function createNotification({
    title,
    message,
    type = 'info',
    userId = null,
    role = null
}: CreateNotificationParams) {
    const supabase = createAdminClient();

    const { error } = await supabase
        .from('notifications')
        .insert([{
            title,
            message,
            type,
            user_id: userId,
            role,
            read: false
        }]);

    if (error) {
        console.error('Error creating notification:', error);
    }

    return { error };
}
