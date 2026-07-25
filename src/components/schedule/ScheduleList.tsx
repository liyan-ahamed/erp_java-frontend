import { Schedule } from '@/types/schedule';
import { useDeleteSchedule } from '@/hooks/useSchedule';
import { Trash2, Calendar, Clock, User, Tag } from 'lucide-react';

interface ScheduleListProps {
  schedules: Schedule[];
  showDelete?: boolean;
}

export const ScheduleList = ({ schedules, showDelete = false }: ScheduleListProps) => {
  const { mutate: deleteSchedule, isPending } = useDeleteSchedule();

  if (!schedules || schedules.length === 0) {
    return (
      <div className="p-8 text-center bg-white/50 backdrop-blur-md rounded-2xl border border-white/60 shadow-sm mt-4">
        <p className="text-slate-500 text-sm">No schedules found.</p>
      </div>
    );
  }

  return (
    <div className="mt-6 flex flex-col space-y-4">
      {schedules.map((schedule) => (
        <div 
          key={schedule.id}
          className="p-5 bg-white/60 backdrop-blur-xl rounded-2xl border border-white/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex items-center justify-between transition-all hover:bg-white/70"
        >
          <div className="flex flex-col space-y-2">
            <div className="flex items-center space-x-3">
              <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${
                schedule.schedule_type === 'DEADLINE' 
                  ? 'bg-rose-100 text-rose-700 border border-rose-200' 
                  : 'bg-blue-100 text-blue-700 border border-blue-200'
              }`}>
                {schedule.schedule_type}
              </span>
              <h3 className="text-base font-bold text-slate-800">{schedule.title}</h3>
            </div>
            
            <div className="flex items-center space-x-6 mt-2 text-xs font-medium text-slate-500">
              <div className="flex items-center space-x-1.5">
                <Calendar className="w-4 h-4 text-slate-400" />
                <span>{schedule.schedule_date}</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <Clock className="w-4 h-4 text-slate-400" />
                <span>{schedule.schedule_time}</span>
              </div>
              {schedule.staff_name && (
                <div className="flex items-center space-x-1.5">
                  <User className="w-4 h-4 text-slate-400" />
                  <span>Assigned to: {schedule.staff_name}</span>
                </div>
              )}
              {schedule.created_by_name && (
                <div className="flex items-center space-x-1.5">
                  <Tag className="w-4 h-4 text-slate-400" />
                  <span>Created by: {schedule.created_by_name}</span>
                </div>
              )}
            </div>
          </div>

          {showDelete && (
            <button
              onClick={() => {
                if (window.confirm('Are you sure you want to delete this schedule?')) {
                  deleteSchedule(schedule.id);
                }
              }}
              disabled={isPending}
              className="p-2.5 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 transition-colors border border-red-100 disabled:opacity-50"
              title="Delete Schedule"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          )}
        </div>
      ))}
    </div>
  );
};
