import { Schedule, HodSchedule } from '@/types/schedule';
import { useDeleteSchedule } from '@/hooks/useSchedule';
import { Trash2, Calendar, Clock, User, Tag } from 'lucide-react';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';

interface ScheduleListProps {
  schedules: (Schedule | HodSchedule)[];
  showDelete?: boolean;
}

export const ScheduleList = ({ schedules, showDelete = false }: ScheduleListProps) => {
  const { mutate: deleteSchedule, isPending } = useDeleteSchedule();

  if (!schedules || schedules.length === 0) {
    return (
      <div className="p-8 text-center mt-4">
        <p className="text-[#666666] text-sm font-medium">No schedules found.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full divide-y divide-[#F5F5F5]">
      {schedules.map((schedule) => {
        const isCompleted = 'completed' in schedule && schedule.completed === true;
        return (
          <div 
            key={schedule.id}
            className={`p-4 md:px-6 md:py-4 flex flex-col md:flex-row md:items-center justify-between transition-colors hover:bg-[#FAFAFA] ${
              isCompleted ? 'opacity-70' : ''
            }`}
          >
            <div className="flex flex-col space-y-2.5">
              <div className="flex items-center space-x-3">
                <Badge variant={schedule.schedule_type === 'DEADLINE' ? 'error' : 'info'}>
                  {schedule.schedule_type}
                </Badge>
                {isCompleted && (
                  <Badge variant="success">
                    Completed
                  </Badge>
                )}
                <h3 className={`text-sm font-semibold ${isCompleted ? 'text-[#9A9A9A] line-through' : 'text-[#111111]'}`}>
                  {schedule.title}
                </h3>
              </div>
              
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-medium text-[#666666]">
                <div className="flex items-center space-x-1.5">
                  <Calendar className="w-3.5 h-3.5 text-[#9A9A9A]" />
                  <span>{schedule.schedule_date}</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <Clock className="w-3.5 h-3.5 text-[#9A9A9A]" />
                  <span>{schedule.schedule_time}</span>
                </div>
                {schedule.staff_name && (
                  <div className="flex items-center space-x-1.5">
                    <User className="w-3.5 h-3.5 text-[#9A9A9A]" />
                    <span>{schedule.staff_name}</span>
                  </div>
                )}
                {schedule.created_by_name && (
                  <div className="flex items-center space-x-1.5">
                    <Tag className="w-3.5 h-3.5 text-[#9A9A9A]" />
                    <span>Created by: {schedule.created_by_name}</span>
                  </div>
                )}
              </div>
            </div>

            {showDelete && (
              <div className="mt-4 md:mt-0 flex items-center justify-end md:pl-5">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    if (window.confirm('Are you sure you want to delete this schedule?')) {
                      deleteSchedule(schedule.id);
                    }
                  }}
                  disabled={isPending}
                  className="text-[#9A9A9A] hover:text-red-600 hover:bg-red-50 px-2"
                  title="Delete Schedule"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
