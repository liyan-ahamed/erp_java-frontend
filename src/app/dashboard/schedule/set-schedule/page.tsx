'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { useStaffList, useSchedules, useCreateSchedule } from '@/hooks/useSchedule';
import { ScheduleList } from '@/components/schedule/ScheduleList';
import { ScheduleType } from '@/types/schedule';
import { ChevronDown, Search, Check, ListTodo } from 'lucide-react';
import { PageContainer } from '@/components/common/PageContainer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';

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
    <PageContainer title="Set Schedule" description="Create and manage deadlines or meetings for staff" rawLayout={true}>
      <div className="space-y-8">
        
        {/* Form Container */}
        <Card>
          <CardHeader>
            <CardTitle>Create New Schedule</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Title */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[#666666] uppercase tracking-wide">Title <span className="text-red-500">*</span></label>
                  <Input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Enter schedule title"
                    required
                  />
                </div>

                {/* Schedule Type */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[#666666] uppercase tracking-wide">Type <span className="text-red-500">*</span></label>
                  <select
                    value={scheduleType}
                    onChange={(e) => setScheduleType(e.target.value as ScheduleType)}
                    className="w-full bg-white border border-[#E8E8E8] rounded-lg text-sm text-[#111111] placeholder-[#9A9A9A] focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black px-3 py-2.5 transition-all appearance-none"
                    required
                  >
                    <option value="" disabled>Select type</option>
                    <option value="DEADLINE">Deadline</option>
                    <option value="MEETING">Meeting</option>
                  </select>
                </div>

                {/* Date */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[#666666] uppercase tracking-wide">Date <span className="text-red-500">*</span></label>
                  <Input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    required
                  />
                </div>

                {/* Time */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[#666666] uppercase tracking-wide">Time <span className="text-red-500">*</span></label>
                  <Input
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    required
                  />
                </div>

                {/* Staff Selection (Multi-select) */}
                <div className="space-y-1 md:col-span-2 relative" ref={dropdownRef}>
                  <label className="text-xs font-semibold text-[#666666] uppercase tracking-wide">Assigned Staff <span className="text-red-500">*</span></label>
                  
                  <div 
                    className="w-full bg-white border border-[#E8E8E8] rounded-lg px-3 py-2.5 cursor-pointer flex items-center justify-between transition-colors hover:bg-[#FAFAFA]"
                    onClick={() => setIsStaffDropdownOpen(!isStaffDropdownOpen)}
                  >
                    <span className={`text-sm ${selectedStaffIds.length === 0 ? 'text-[#9A9A9A]' : 'text-[#111111]'}`}>
                      {selectedStaffIds.length === 0 
                        ? 'Select staff members' 
                        : isAllSelected 
                          ? 'All Staff Selected' 
                          : `${selectedStaffIds.length} staff member(s) selected`}
                    </span>
                    <ChevronDown className={`w-4 h-4 text-[#9A9A9A] transition-transform ${isStaffDropdownOpen ? 'rotate-180' : ''}`} />
                  </div>

                  {isStaffDropdownOpen && (
                    <div className="absolute z-20 w-full mt-2 bg-white rounded-lg shadow-lg border border-[#E8E8E8] overflow-hidden">
                      <div className="p-3 border-b border-[#F5F5F5] bg-[#FAFAFA]">
                        <Input
                          type="text"
                          placeholder="Search staff..."
                          value={staffSearchQuery}
                          onChange={(e) => setStaffSearchQuery(e.target.value)}
                          icon={<Search className="w-4 h-4" />}
                        />
                      </div>
                      
                      <div className="max-h-60 overflow-y-auto p-2 space-y-1">
                        {isStaffLoading ? (
                          <div className="p-4 text-center text-sm font-medium text-[#9A9A9A]">Loading staff...</div>
                        ) : (
                          <>
                            <div 
                              className="flex items-center space-x-3 p-2.5 rounded-lg hover:bg-[#FAFAFA] cursor-pointer transition-colors"
                              onClick={toggleSelectAll}
                            >
                              <div className={`w-4 h-4 rounded flex items-center justify-center transition-colors ${isAllSelected ? 'bg-[#111111]' : 'border border-[#D4D4D4] bg-white'}`}>
                                {isAllSelected && <Check className="w-3 h-3 text-white stroke-[3]" />}
                              </div>
                              <span className="font-medium text-[#111111] text-sm">All Staff</span>
                            </div>
                            
                            {filteredStaff.length === 0 ? (
                              <div className="p-4 text-center text-sm font-medium text-[#9A9A9A]">No staff found</div>
                            ) : (
                              filteredStaff.map(staff => (
                                <div 
                                  key={staff.id}
                                  className="flex items-center space-x-3 p-2.5 rounded-lg hover:bg-[#FAFAFA] cursor-pointer transition-colors"
                                  onClick={() => toggleStaffSelection(staff.id)}
                                >
                                  <div className={`w-4 h-4 rounded flex items-center justify-center transition-colors ${selectedStaffIds.includes(staff.id) ? 'bg-[#111111]' : 'border border-[#D4D4D4] bg-white'}`}>
                                    {selectedStaffIds.includes(staff.id) && <Check className="w-3 h-3 text-white stroke-[3]" />}
                                  </div>
                                  <div className="flex flex-col">
                                    <span className="font-medium text-[#111111] text-sm">{staff.name}</span>
                                    <span className="text-[11px] text-[#666666]">{staff.email}</span>
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

              <div className="pt-6 border-t border-[#F5F5F5] flex justify-end">
                <Button
                  type="submit"
                  variant="primary"
                  isLoading={isCreating}
                >
                  Create Schedule
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Schedule List */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div className="flex items-center space-x-2">
              <ListTodo className="w-4 h-4 text-[#9A9A9A]" />
              <CardTitle className="text-sm font-semibold">Created Schedules</CardTitle>
            </div>
            
            <div className="flex items-center space-x-1 bg-[#FAFAFA] border border-[#E8E8E8] p-1 rounded-lg">
              {['ALL', 'ACTIVE', 'COMPLETED'].map((f) => (
                <label 
                  key={f}
                  className={`px-3 py-1 rounded-md text-xs font-semibold tracking-wide cursor-pointer transition-colors ${
                    filter === f 
                      ? 'bg-white shadow-sm border border-[#E8E8E8] text-[#111111]' 
                      : 'text-[#666666] hover:text-[#111111] border border-transparent'
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
          </CardHeader>
          <CardContent className="p-0">
            {isSchedulesLoading ? (
              <div className="p-12 text-center text-[#9A9A9A] flex flex-col items-center justify-center space-y-4">
                <Spinner size="lg" />
                <span className="text-sm font-medium">Loading schedules...</span>
              </div>
            ) : (
              <ScheduleList schedules={filteredSchedules} showDelete={true} />
            )}
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
