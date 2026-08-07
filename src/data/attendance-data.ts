import { Employee, AttendanceRecord, AttendanceSummary, AttendanceStatus, AttendanceAnalytics, EmployeeAttendanceProfile } from '@/types/attendance';

// ─── Seed helpers ───────────────────────────────────────────────────────────
const seededRandom = (seed: number) => {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
};

const rng = seededRandom(42);
const pick = <T>(arr: T[]): T => arr[Math.floor(rng() * arr.length)];
const randBetween = (min: number, max: number) => Math.floor(rng() * (max - min + 1)) + min;
const randFloat = (min: number, max: number) => +(min + rng() * (max - min)).toFixed(1);

// ─── Reference data ─────────────────────────────────────────────────────────
const departments = ['Computer Science', 'Electronics', 'Mechanical', 'Civil', 'Mathematics', 'Physics'];
const designations = ['Professor', 'Associate Professor', 'Assistant Professor', 'Senior Lecturer', 'Lecturer', 'Lab Assistant'];
const locations = ['Main Campus', 'Block A', 'Block B', 'Library Wing', 'Remote'];

const firstNames = [
  'Aarav', 'Priya', 'Rahul', 'Ananya', 'Vikram', 'Deepak', 'Neha', 'Sanjay',
  'Meera', 'Arun', 'Kavita', 'Rohan', 'Pooja', 'Amit', 'Swati', 'Rajesh',
  'Divya', 'Manoj', 'Sneha', 'Kiran', 'Ravi', 'Nisha', 'Suresh', 'Preeti',
  'Arjun', 'Lakshmi', 'Varun', 'Rekha', 'Vivek', 'Sunita', 'Gaurav', 'Anjali',
  'Harish', 'Bhavna', 'Tarun', 'Pallavi', 'Nikhil', 'Rina', 'Ashok', 'Shweta',
  'Dev', 'Madhuri', 'Pankaj', 'Simran', 'Yogesh', 'Jyoti', 'Abhishek', 'Komal',
  'Siddharth', 'Manisha',
];

const lastNames = [
  'Sharma', 'Patel', 'Singh', 'Gupta', 'Kumar', 'Verma', 'Reddy', 'Mehta',
  'Nair', 'Joshi', 'Iyer', 'Banerjee', 'Das', 'Chatterjee', 'Mishra', 'Rao',
  'Pillai', 'Menon', 'Bhat', 'Kulkarni', 'Deshmukh', 'Patil', 'Ghosh', 'Saxena',
  'Agarwal', 'Tiwari', 'Pandey', 'Srinivasan', 'Kapoor', 'Malhotra', 'Thakur', 'Bose',
  'Shah', 'Chowdhury', 'Mahajan', 'Hegde', 'Rajan', 'Chauhan', 'Sethi', 'Grover',
  'Dubey', 'Goswami', 'Kaur', 'Prasad', 'Dutta', 'Sinha', 'Mukherjee', 'Roy',
  'Bhatt', 'Chand',
];

const managers = ['Dr. Kumar', 'Prof. Sharma', 'Dr. Iyer', 'Prof. Banerjee', 'Dr. Rao', 'Prof. Menon'];

// ─── Generate 50 employees ─────────────────────────────────────────────────
export const mockEmployees: Employee[] = firstNames.map((first, i) => ({
  id: i + 1,
  employee_id: `EMP${String(1001 + i).padStart(4, '0')}`,
  name: `${first} ${lastNames[i]}`,
  email: `${first.toLowerCase()}.${lastNames[i].toLowerCase()}@dept.edu`,
  department: departments[i % departments.length],
  designation: designations[i % designations.length],
  manager: managers[i % managers.length],
  joined_date: `${2018 + (i % 8)}-${String((i % 12) + 1).padStart(2, '0')}-15`,
}));

// ─── Holidays in the last 30 days ──────────────────────────────────────────
const today = new Date();
const holidays: string[] = [];
// Add Independence Day if in range
const indDay = new Date(today.getFullYear(), 7, 15); // Aug 15
if (indDay <= today && indDay >= new Date(today.getTime() - 30 * 86400000)) {
  holidays.push(indDay.toISOString().split('T')[0]);
}

const isWeekend = (d: Date) => d.getDay() === 0 || d.getDay() === 6;
const isHoliday = (d: Date) => holidays.includes(d.toISOString().split('T')[0]);

// ─── Generate 30 days of attendance records ─────────────────────────────────
const allRecords: AttendanceRecord[] = [];
let recordId = 1;

for (const emp of mockEmployees) {
  for (let dayOffset = 29; dayOffset >= 0; dayOffset--) {
    const date = new Date(today);
    date.setDate(date.getDate() - dayOffset);
    date.setHours(0, 0, 0, 0);
    const dateStr = date.toISOString().split('T')[0];

    let status: AttendanceStatus;
    let checkIn: string | null = null;
    let checkOut: string | null = null;
    let breakDuration = 0;
    let workingHours = 0;
    let overtime = 0;
    let location = pick(locations.slice(0, 4)); // Mostly on-campus

    if (isWeekend(date)) {
      status = 'WEEKEND';
    } else if (isHoliday(date)) {
      status = 'HOLIDAY';
    } else {
      const roll = rng();
      if (roll < 0.02) {
        // 2% absent
        status = 'ABSENT';
      } else if (roll < 0.04) {
        // 2% on leave
        status = 'ON_LEAVE';
      } else if (roll < 0.06) {
        // 2% half day
        status = 'HALF_DAY';
        const h = randBetween(8, 9);
        const m = randBetween(0, 59);
        checkIn = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
        checkOut = `${String(h + 4).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
        breakDuration = 15;
        workingHours = 3.75;
      } else if (roll < 0.10) {
        // 4% WFH
        status = 'WORK_FROM_HOME';
        location = 'Remote';
        const h = randBetween(8, 9);
        const m = randBetween(15, 55);
        checkIn = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
        const outH = randBetween(17, 19);
        const outM = randBetween(0, 45);
        checkOut = `${String(outH).padStart(2, '0')}:${String(outM).padStart(2, '0')}`;
        breakDuration = randBetween(30, 60);
        workingHours = randFloat(7.5, 9.5);
        overtime = workingHours > 8 ? +(workingHours - 8).toFixed(1) : 0;
      } else if (roll < 0.16) {
        // 6% late
        status = 'LATE';
        const h = randBetween(10, 10);
        const m = randBetween(1, 59);
        checkIn = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
        const outH = randBetween(18, 19);
        const outM = randBetween(0, 30);
        checkOut = `${String(outH).padStart(2, '0')}:${String(outM).padStart(2, '0')}`;
        breakDuration = randBetween(30, 60);
        workingHours = randFloat(7.0, 8.5);
        overtime = workingHours > 8 ? +(workingHours - 8).toFixed(1) : 0;
      } else {
        // ~84% present on time
        status = 'PRESENT';
        const h = randBetween(8, 9);
        const m = randBetween(0, 55);
        checkIn = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
        const outH = randBetween(17, 19);
        const outM = randBetween(0, 45);
        checkOut = `${String(outH).padStart(2, '0')}:${String(outM).padStart(2, '0')}`;
        breakDuration = randBetween(30, 60);
        workingHours = randFloat(7.5, 10);
        overtime = workingHours > 8 ? +(workingHours - 8).toFixed(1) : 0;
      }
    }

    allRecords.push({
      id: recordId++,
      employee_id: emp.id,
      employee_name: emp.name,
      employee_code: emp.employee_id,
      department: emp.department,
      designation: emp.designation,
      date: dateStr,
      check_in: checkIn,
      check_out: checkOut,
      break_duration: breakDuration,
      working_hours: workingHours,
      overtime,
      status,
      location,
      manager: emp.manager,
      attendance_percentage: 0, // Computed below
    });
  }
}

// ─── Compute per-employee attendance percentage ─────────────────────────────
for (const emp of mockEmployees) {
  const empRecords = allRecords.filter(r => r.employee_id === emp.id);
  const workDays = empRecords.filter(r => r.status !== 'WEEKEND' && r.status !== 'HOLIDAY');
  const presentDays = workDays.filter(r => ['PRESENT', 'LATE', 'WORK_FROM_HOME', 'HALF_DAY'].includes(r.status));
  const pct = workDays.length > 0 ? +((presentDays.length / workDays.length) * 100).toFixed(1) : 0;
  empRecords.forEach(r => { r.attendance_percentage = pct; });
}

export const mockAttendanceRecords = allRecords;

// ─── Summary for today (or latest working day) ─────────────────────────────
export const getAttendanceSummary = (dateStr?: string): AttendanceSummary => {
  const targetDate = dateStr || new Date().toISOString().split('T')[0];
  const dayRecords = allRecords.filter(r => r.date === targetDate);
  
  if (dayRecords.length === 0) {
    // Find last available day
    const dates = [...new Set(allRecords.map(r => r.date))].sort().reverse();
    const workDate = dates.find(d => {
      const dd = new Date(d);
      return !isWeekend(dd) && !isHoliday(dd);
    });
    if (workDate) {
      return getAttendanceSummary(workDate);
    }
  }

  const present = dayRecords.filter(r => r.status === 'PRESENT').length;
  const absent = dayRecords.filter(r => r.status === 'ABSENT').length;
  const late = dayRecords.filter(r => r.status === 'LATE').length;
  const halfDay = dayRecords.filter(r => r.status === 'HALF_DAY').length;
  const onLeave = dayRecords.filter(r => r.status === 'ON_LEAVE').length;
  const wfh = dayRecords.filter(r => r.status === 'WORK_FROM_HOME').length;
  const total = mockEmployees.length;
  const workDays = dayRecords.filter(r => r.status !== 'WEEKEND' && r.status !== 'HOLIDAY');
  const presentTotal = present + late + wfh + halfDay;
  const pct = workDays.length > 0 ? +((presentTotal / workDays.length) * 100).toFixed(1) : 0;
  const avgHours = workDays.length > 0
    ? +(workDays.reduce((s, r) => s + r.working_hours, 0) / workDays.filter(r => r.working_hours > 0).length).toFixed(1)
    : 0;

  return {
    present,
    absent,
    late,
    half_day: halfDay,
    on_leave: onLeave,
    work_from_home: wfh,
    attendance_percentage: pct,
    average_working_hours: avgHours || 8.2,
    total_employees: total,
  };
};

// ─── Analytics data ─────────────────────────────────────────────────────────
export const getAttendanceAnalytics = (): AttendanceAnalytics => {
  const last14Days: string[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    last14Days.push(d.toISOString().split('T')[0]);
  }

  const daily_trend = last14Days.map(date => {
    const dayRecs = allRecords.filter(r => r.date === date && r.status !== 'WEEKEND' && r.status !== 'HOLIDAY');
    return {
      date,
      present: dayRecs.filter(r => ['PRESENT', 'WORK_FROM_HOME'].includes(r.status)).length,
      absent: dayRecs.filter(r => ['ABSENT', 'ON_LEAVE'].includes(r.status)).length,
      late: dayRecs.filter(r => r.status === 'LATE').length,
    };
  });

  const department_comparison = departments.map(dept => {
    const deptRecs = allRecords.filter(r => r.department === dept && r.status !== 'WEEKEND' && r.status !== 'HOLIDAY');
    const deptPresent = deptRecs.filter(r => ['PRESENT', 'LATE', 'WORK_FROM_HOME', 'HALF_DAY'].includes(r.status));
    return {
      department: dept,
      percentage: deptRecs.length > 0 ? +((deptPresent.length / deptRecs.length) * 100).toFixed(1) : 0,
    };
  });

  const late_arrival_trend = last14Days.map(date => ({
    date,
    count: allRecords.filter(r => r.date === date && r.status === 'LATE').length,
  }));

  const allWorkHours = allRecords.filter(r => r.working_hours > 0).map(r => r.working_hours);
  const working_hours_distribution = [
    { range: '<7h', count: allWorkHours.filter(h => h < 7).length },
    { range: '7-8h', count: allWorkHours.filter(h => h >= 7 && h < 8).length },
    { range: '8-9h', count: allWorkHours.filter(h => h >= 8 && h < 9).length },
    { range: '9-10h', count: allWorkHours.filter(h => h >= 9 && h < 10).length },
    { range: '10h+', count: allWorkHours.filter(h => h >= 10).length },
  ];

  const leave_distribution = [
    { type: 'Casual Leave', count: Math.floor(rng() * 15) + 8 },
    { type: 'Sick Leave', count: Math.floor(rng() * 10) + 3 },
    { type: 'Earned Leave', count: Math.floor(rng() * 8) + 2 },
    { type: 'Maternity/Paternity', count: Math.floor(rng() * 3) },
    { type: 'Compensatory', count: Math.floor(rng() * 5) + 1 },
  ];

  const wfhCount = allRecords.filter(r => r.status === 'WORK_FROM_HOME').length;
  const officeCount = allRecords.filter(r => r.status === 'PRESENT').length;

  return {
    daily_trend,
    department_comparison,
    late_arrival_trend,
    working_hours_distribution,
    leave_distribution,
    remote_vs_office: { remote: wfhCount, office: officeCount },
  };
};

// ─── Employee attendance profile ────────────────────────────────────────────
export const getEmployeeAttendanceProfile = (employeeId: number): EmployeeAttendanceProfile | null => {
  const employee = mockEmployees.find(e => e.id === employeeId);
  if (!employee) return null;

  const empRecords = allRecords.filter(r => r.employee_id === employeeId);
  const workDays = empRecords.filter(r => r.status !== 'WEEKEND' && r.status !== 'HOLIDAY');
  const presentDays = workDays.filter(r => ['PRESENT', 'LATE', 'WORK_FROM_HOME', 'HALF_DAY'].includes(r.status));
  const lateDays = workDays.filter(r => r.status === 'LATE');
  const leaveDays = workDays.filter(r => r.status === 'ON_LEAVE');
  const hoursWorked = workDays.filter(r => r.working_hours > 0);
  const avgHours = hoursWorked.length > 0 ? +(hoursWorked.reduce((s, r) => s + r.working_hours, 0) / hoursWorked.length).toFixed(1) : 0;
  const pct = workDays.length > 0 ? +((presentDays.length / workDays.length) * 100).toFixed(1) : 0;

  const working_hour_trend = empRecords
    .filter(r => r.working_hours > 0)
    .slice(-14)
    .map(r => ({ date: r.date, hours: r.working_hours }));

  return {
    employee,
    summary: getAttendanceSummary(),
    monthly_records: empRecords,
    attendance_percentage: pct,
    average_working_hours: avgHours,
    total_late_arrivals: lateDays.length,
    total_leaves_taken: leaveDays.length,
    working_hour_trend,
  };
};

export const DEPARTMENTS = departments;
export const ATTENDANCE_STATUSES: AttendanceStatus[] = ['PRESENT', 'ABSENT', 'LATE', 'HALF_DAY', 'WORK_FROM_HOME', 'ON_LEAVE', 'WEEKEND', 'HOLIDAY'];
