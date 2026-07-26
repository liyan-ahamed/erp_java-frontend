'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { useStaffList, useSchedules, useCreateSchedule } from '@/hooks/useSchedule';
import { ScheduleList } from '@/components/schedule/ScheduleList';
import { ScheduleType } from '@/types/schedule';
import { ChevronDown, Search, Check, Loader2 } from 'lucide-react';

export default function SetSchedulePage() {
  const { hasRole } = useAuth();
  const router = useRouter();
  
  // Form State
  const [title, setTitle] = useState('');
  const [scheduleType, setScheduleType] = useState<ScheduleType | ''>('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  
  // Staff Selection State
  const [selectedStaffIds, setSelectedStaffIds] = useState<number[]>([]);
  const [isStaffDropdownOpen, setIsStaffDropdownOpen] = useState(false);
  const [staffSearchQuery, setStaffSearchQuery] = useState('');
  
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { data: staffList = [], isLoading: isStaffLoading } = useStaffList();
  const { data: schedules = [], isLoading: isSchedulesLoading } = useSchedules();
  const { mutate: createSchedule, isPending: isCreating } = useCreateSchedule();

  const [filter, setFilter] = useState<'ALL' | 'ACTIVE' | 'COMPLETED'>('ALL');

  const filteredSchedules = schedules.filter(schedule => {
    const isCompleted = 'completed' in schedule && schedule.completed === true;
    if (filter === 'ACTIVE') return !isCompleted;
    if (filter === 'COMPLETED') return isCompleted;
    return true;
  });

  useEffect(() => {
    if (!hasRole('ROLE_HOD')) {
      router.push('/dashboard');
    }
  }, [hasRole, router]);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsStaffDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!hasRole('ROLE_HOD')) return null;

  const filteredStaff = staffList.filter(staff => 
    staff.name.toLowerCase().includes(staffSearchQuery.toLowerCase()) ||
    staff.email.toLowerCase().includes(staffSearchQuery.toLowerCase())
  );

  const isAllSelected = staffList.length > 0 && selectedStaffIds.length === staffList.length;

  const toggleStaffSelection = (id: number) => {
    if (selectedStaffIds.includes(id)) {
      setSelectedStaffIds(selectedStaffIds.filter(staffId => staffId !== id));
    } else {
      setSelectedStaffIds([...selectedStaffIds, id]);
    }
  };

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedStaffIds([]);
    } else {
      setSelectedStaffIds(staffList.map(s => s.id));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedStaffIds.length === 0 || !scheduleType || !title || !date || !time) {
      alert('Please fill all required fields and select at least one staff member.');
      return;
    }

    createSchedule(
      {
        staff_ids: selectedStaffIds,
        schedule_type: scheduleType as ScheduleType,
        title,
        date,
        time,
      },
      {
        onSuccess: () => {
          setTitle('');
          setScheduleType('');
          setDate('');
          setTime('');
          setSelectedStaffIds([]);
        },
        onError: (error) => {
          alert(`Error creating schedule: ${error.message}`);
        }
      }
    );
  };

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
      <div className="flex flex-col space-y-2">
        <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Set Schedule</h1>
        <p className="text-slate-500 font-medium">Create and manage deadlines or meetings for staff</p>
      </div>

      <div className="bg-white/40 backdrop-blur-xl rounded-3xl border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Title */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Title <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter schedule title"
                className="w-full px-4 py-3 rounded-xl bg-white/50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-transparent transition-all placeholder:text-slate-400 font-medium"
                required
              />
            </div>

            {/* Schedule Type */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Type <span className="text-red-500">*</span></label>
              <select
                value={scheduleType}
                onChange={(e) => setScheduleType(e.target.value as ScheduleType)}
                className="w-full px-4 py-3 rounded-xl bg-white/50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-transparent transition-all text-slate-700 font-medium appearance-none"
                required
              >
                <option value="" disabled>Select type</option>
                <option value="DEADLINE">Deadline</option>
                <option value="MEETING">Meeting</option>
              </select>
            </div>

            {/* Date */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Date <span className="text-red-500">*</span></label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-white/50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-transparent transition-all text-slate-700 font-medium"
                required
              />
            </div>

            {/* Time */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Time <span className="text-red-500">*</span></label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-white/50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-transparent transition-all text-slate-700 font-medium"
                required
              />
            </div>

            {/* Staff Selection (Multi-select) */}
            <div className="space-y-2 md:col-span-2 relative" ref={dropdownRef}>
              <label className="text-sm font-semibold text-slate-700">Assigned Staff <span className="text-red-500">*</span></label>
              
              <div 
                className="w-full px-4 py-3 rounded-xl bg-white/50 border border-slate-200 cursor-pointer flex items-center justify-between transition-all hover:bg-white/70"
                onClick={() => setIsStaffDropdownOpen(!isStaffDropdownOpen)}
              >
                <span className={`font-medium ${selectedStaffIds.length === 0 ? 'text-slate-400' : 'text-slate-700'}`}>
                  {selectedStaffIds.length === 0 
                    ? 'Select staff members' 
                    : isAllSelected 
                      ? 'All Staff Selected' 
                      : `${selectedStaffIds.length} staff member(s) selected`}
                </span>
                <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform ${isStaffDropdownOpen ? 'rotate-180' : ''}`} />
              </div>

              {isStaffDropdownOpen && (
                <div className="absolute z-10 w-full mt-2 bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden">
                  <div className="p-3 border-b border-slate-100 bg-slate-50/50">
                    <div className="relative">
                      <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input 
                        type="text" 
                        placeholder="Search staff..."
                        value={staffSearchQuery}
                        onChange={(e) => setStaffSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 transition-all"
                      />
                    </div>
                  </div>
                  
                  <div className="max-h-60 overflow-y-auto p-2 space-y-1">
                    {isStaffLoading ? (
                      <div className="p-4 text-center text-sm text-slate-500">Loading staff...</div>
                    ) : (
                      <>
                        <div 
                          className="flex items-center space-x-3 p-2.5 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors"
                          onClick={toggleSelectAll}
                        >
                          <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${isAllSelected ? 'bg-slate-800 border-slate-800' : 'border-slate-300 bg-white'}`}>
                            {isAllSelected && <Check className="w-3.5 h-3.5 text-white" />}
                          </div>
                          <span className="font-semibold text-slate-700 text-sm">All Staff</span>
                        </div>
                        
                        {filteredStaff.length === 0 ? (
                          <div className="p-4 text-center text-sm text-slate-500">No staff found</div>
                        ) : (
                          filteredStaff.map(staff => (
                            <div 
                              key={staff.id}
                              className="flex items-center space-x-3 p-2.5 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors"
                              onClick={() => toggleStaffSelection(staff.id)}
                            >
                              <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${selectedStaffIds.includes(staff.id) ? 'bg-slate-800 border-slate-800' : 'border-slate-300 bg-white'}`}>
                                {selectedStaffIds.includes(staff.id) && <Check className="w-3.5 h-3.5 text-white" />}
                              </div>
                              <div className="flex flex-col">
                                <span className="font-medium text-slate-700 text-sm">{staff.name}</span>
                                <span className="text-xs text-slate-500">{staff.email}</span>
                              </div>
                            </div>
                          ))
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>

          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-end">
            <button
              type="submit"
              disabled={isCreating}
              className="bg-slate-900 hover:bg-slate-800 text-white px-6 py-3 rounded-xl font-semibold transition-all shadow-md hover:shadow-lg disabled:opacity-70 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {isCreating && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>Create Schedule</span>
            </button>
          </div>
        </form>
      </div>

      <div className="pt-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-xl font-bold text-slate-800 mb-2">Created Schedules</h2>
            <p className="text-slate-500 text-sm font-medium">Manage your created schedules below</p>
          </div>
          
          {/* Filter Radio Buttons */}
          <div className="flex items-center space-x-2 bg-white/50 backdrop-blur-sm p-1.5 rounded-xl border border-slate-200">
            {['ALL', 'ACTIVE', 'COMPLETED'].map((f) => (
              <label 
                key={f}
                className={`px-4 py-2 rounded-lg text-sm font-semibold cursor-pointer transition-all ${
                  filter === f 
                    ? 'bg-white shadow-sm text-slate-800 border-slate-200' 
                    : 'text-slate-500 hover:text-slate-700 hover:bg-white/40'
                }`}
              >
                <input 
                  type="radio" 
                  name="schedule-filter"
                  value={f}
                  checked={filter === f}
                  onChange={() => setFilter(f as 'ALL' | 'ACTIVE' | 'COMPLETED')}
                  className="sr-only"
                />
                {f.charAt(0) + f.slice(1).toLowerCase()}
              </label>
            ))}
          </div>
        </div>
        
        {isSchedulesLoading ? (
          <div className="p-8 text-center text-slate-500 flex flex-col items-center justify-center space-y-3 mt-4">
            <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
            <span className="text-sm font-medium">Loading schedules...</span>
          </div>
        ) : (
          <ScheduleList schedules={filteredSchedules} showDelete={true} />
        )}
      </div>
    </div>
  );
}
