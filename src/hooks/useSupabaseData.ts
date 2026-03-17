import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function useSupabaseQuery<T>(
  table: string,
  options?: {
    select?: string;
    filters?: Array<{ column: string; op: string; value: any }>;
    orderBy?: { column: string; ascending?: boolean };
    enabled?: boolean;
  }
) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (options?.enabled === false) return;
    setLoading(true);
    let query = (supabase as any).from(table).select(options?.select || '*');
    if (options?.filters) {
      for (const f of options.filters) {
        query = query.filter(f.column, f.op, f.value);
      }
    }
    if (options?.orderBy) {
      query = query.order(options.orderBy.column, { ascending: options.orderBy.ascending ?? true });
    }
    const { data: result, error: err } = await query;
    if (err) {
      setError(err.message);
    } else {
      setData(result || []);
    }
    setLoading(false);
  }, [table, JSON.stringify(options)]);

  useEffect(() => { fetch(); }, [fetch]);

  return { data, loading, error, refetch: fetch, setData };
}

// Profiles
export function useProfiles() {
  return useSupabaseQuery<{
    id: string; email: string; name: string; role: string; status: string; created_at: string; must_change_password: boolean;
  }>('profiles', { orderBy: { column: 'name' } });
}

// Rooms
export function useRooms() {
  return useSupabaseQuery<{
    id: string; name: string; capacity: number; created_at: string;
  }>('rooms', { orderBy: { column: 'name' } });
}

// Schedules
export function useSchedules() {
  return useSupabaseQuery<{
    id: string; room_id: string;
    day_of_week: number; start_time: string; end_time: string;
    recurring: boolean; date: string | null; created_at: string;
    teacher_id: string | null; student_id: string | null;
  }>('schedules');
}

// Schedule teachers junction
export function useScheduleTeachers() {
  return useSupabaseQuery<{
    id: string; schedule_id: string; teacher_id: string;
  }>('schedule_teachers');
}

// Schedule students junction
export function useScheduleStudents() {
  return useSupabaseQuery<{
    id: string; schedule_id: string; student_id: string;
  }>('schedule_students');
}

// Class records
export function useClassRecords() {
  return useSupabaseQuery<{
    id: string; schedule_id: string; date: string; summary: string;
    status: string; attendance: string | null; reschedule_pending: boolean;
    created_at: string; updated_at: string;
  }>('class_records', { orderBy: { column: 'date', ascending: false } });
}

// Class attachments
export function useClassAttachments(classRecordId?: string) {
  return useSupabaseQuery<{
    id: string; class_record_id: string; file_name: string;
    file_path: string; file_url: string; uploaded_by: string; created_at: string;
  }>('class_attachments', {
    ...(classRecordId ? { filters: [{ column: 'class_record_id', op: 'eq', value: classRecordId }] } : {}),
    orderBy: { column: 'created_at', ascending: false },
  });
}

// Evaluations
export function useEvaluations() {
  return useSupabaseQuery<{
    id: string; teacher_id: string; student_id: string; date: string;
    technique: number; theory: number; commitment: number; notes: string;
    created_at: string;
  }>('evaluations', { orderBy: { column: 'date', ascending: false } });
}

// Notifications
export function useNotifications(userId?: string) {
  return useSupabaseQuery<{
    id: string; user_id: string; message: string; type: string;
    read: boolean; created_at: string;
  }>('notifications', {
    ...(userId ? { filters: [{ column: 'user_id', op: 'eq', value: userId }] } : {}),
    orderBy: { column: 'created_at', ascending: false },
    enabled: !!userId,
  });
}

// Rescheduled classes
export function useRescheduledClasses() {
  return useSupabaseQuery<{
    id: string; original_class_record_id: string; new_date: string;
    new_start_time: string; new_end_time: string; room_id: string;
    status: string; created_at: string;
  }>('rescheduled_classes', { orderBy: { column: 'created_at', ascending: false } });
}

// File upload helper
export async function uploadClassDocument(file: File, classRecordId: string, uploadedBy: string) {
  const fileExt = file.name.split('.').pop();
  const filePath = `${classRecordId}/${Date.now()}.${fileExt}`;

  const { error: uploadError } = await supabase.storage
    .from('class-documents')
    .upload(filePath, file);

  if (uploadError) throw uploadError;

  const { data: urlData } = supabase.storage
    .from('class-documents')
    .getPublicUrl(filePath);

  const { error: insertError } = await (supabase.from('class_attachments') as any).insert({
    class_record_id: classRecordId,
    file_name: file.name,
    file_path: filePath,
    file_url: urlData.publicUrl,
    uploaded_by: uploadedBy,
  });

  if (insertError) throw insertError;
  return urlData.publicUrl;
}

// Notification helper
export async function createNotification(userId: string, message: string, type: string) {
  const { error } = await (supabase.from('notifications') as any).insert({
    user_id: userId,
    message,
    type,
  });
  if (error) throw error;
}

// Helper: get teacher IDs for a schedule
export function getScheduleTeacherIds(scheduleId: string, scheduleTeachers: Array<{ schedule_id: string; teacher_id: string }>) {
  return scheduleTeachers.filter(st => st.schedule_id === scheduleId).map(st => st.teacher_id);
}

// Helper: get student IDs for a schedule
export function getScheduleStudentIds(scheduleId: string, scheduleStudents: Array<{ schedule_id: string; student_id: string }>) {
  return scheduleStudents.filter(ss => ss.schedule_id === scheduleId).map(ss => ss.student_id);
}
