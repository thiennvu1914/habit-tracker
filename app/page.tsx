"use client";

import {
  FormEvent,
  KeyboardEvent,
  useEffect,
  useMemo,
  useState,
} from "react";

type ScheduleMode = "daily" | "selected_days" | "weekly_target" | "specific_dates";

type HabitSchedule = {
  mode: ScheduleMode;
  selectedWeekdays: number[];
  weeklyTarget: number;
  specificDates: string[];
  allowReschedule: boolean;
};

type ScheduleVersion = {
  effectiveFrom: string;
  schedule: HabitSchedule;
};

type Habit = {
  id: string;
  name: string;
  emoji: string;
  schedule: HabitSchedule;
  scheduleHistory?: ScheduleVersion[];
};

type TrackerData = {
  habits: Habit[];
  completions: Record<string, boolean>;
  wellness: Record<string, number>;
  rests: Record<string, boolean>;
  reschedules: Record<string, string>;
};

type ModalMode = "add" | "edit" | null;
type CellState = "scheduled" | "flexible" | "off" | "rest" | "moved" | "target";
type ActionTarget = { habitId: string; dateKey: string } | null;

const STORAGE_KEY = "ritual-habit-tracker-v1";
const MAX_HABITS = 20;
const DEFAULT_SCHEDULE: HabitSchedule = {
  mode: "daily",
  selectedWeekdays: [1, 2, 3, 4, 5],
  weeklyTarget: 3,
  specificDates: [],
  allowReschedule: true,
};

const DEFAULT_HABITS: Habit[] = [
  { id: "wake-early", name: "Thức dậy lúc 05:00", emoji: "⏰", schedule: { ...DEFAULT_SCHEDULE, mode: "daily" } },
  { id: "exercise", name: "Tập thể dục", emoji: "💪", schedule: { ...DEFAULT_SCHEDULE, mode: "weekly_target", weeklyTarget: 3 } },
  { id: "reading", name: "Đọc / học", emoji: "📚", schedule: { ...DEFAULT_SCHEDULE, mode: "daily" } },
  { id: "planning", name: "Lên kế hoạch ngày", emoji: "🗓️", schedule: { ...DEFAULT_SCHEDULE, mode: "selected_days", selectedWeekdays: [1, 2, 3, 4, 5] } },
  { id: "deep-work", name: "Deep work", emoji: "🎯", schedule: { ...DEFAULT_SCHEDULE, mode: "selected_days", selectedWeekdays: [1, 2, 3, 4, 5] } },
  { id: "japanese", name: "Học tiếng Nhật", emoji: "🇯🇵", schedule: { ...DEFAULT_SCHEDULE, mode: "selected_days", selectedWeekdays: [1, 3, 5] } },
  { id: "english", name: "Học tiếng Anh", emoji: "🗣️", schedule: { ...DEFAULT_SCHEDULE, mode: "selected_days", selectedWeekdays: [2, 4, 6] } },
  { id: "aws", name: "Ôn tập AWS", emoji: "☁️", schedule: { ...DEFAULT_SCHEDULE, mode: "weekly_target", weeklyTarget: 4 } },
  { id: "detox", name: "Giảm mạng xã hội", emoji: "🌿", schedule: { ...DEFAULT_SCHEDULE, mode: "daily" } },
  { id: "tomorrow", name: "Chuẩn bị ngày mai", emoji: "✍️", schedule: { ...DEFAULT_SCHEDULE, mode: "selected_days", selectedWeekdays: [0, 1, 2, 3, 4, 5] } },
];

const EMOJI_PRESETS = ["🎯", "📚", "💪", "⏰", "🗓️", "🧘", "💧", "☁️", "🌿", "✍️", "🗣️", "✨"];
const DAY_LABELS = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
const WEEKDAY_CHOICES = [
  { value: 1, label: "T2" },
  { value: 2, label: "T3" },
  { value: 3, label: "T4" },
  { value: 4, label: "T5" },
  { value: 5, label: "T6" },
  { value: 6, label: "T7" },
  { value: 0, label: "CN" },
];
const MONTH_LABELS = ["Tháng 1", "Tháng 2", "Tháng 3", "Tháng 4", "Tháng 5", "Tháng 6", "Tháng 7", "Tháng 8", "Tháng 9", "Tháng 10", "Tháng 11", "Tháng 12"];

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function toDateKey(year: number, month: number, day: number) {
  return `${year}-${pad(month + 1)}-${pad(day)}`;
}

function dateToKey(date: Date) {
  return toDateKey(date.getFullYear(), date.getMonth(), date.getDate());
}

function parseDateKey(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function completionKey(habitId: string, date: string) {
  return `${habitId}::${date}`;
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function daysInMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}

function monthKey(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;
}

function addDays(date: Date, amount: number) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + amount);
}

function startOfWeek(date: Date) {
  const offset = (date.getDay() + 6) % 7;
  return addDays(date, -offset);
}

function endOfWeek(date: Date) {
  return addDays(startOfWeek(date), 6);
}

function datesOfWeek(date: Date) {
  const start = startOfWeek(date);
  return Array.from({ length: 7 }, (_, index) => addDays(start, index));
}

function normalizeSchedule(value?: Partial<HabitSchedule>): HabitSchedule {
  const mode: ScheduleMode = ["daily", "selected_days", "weekly_target", "specific_dates"].includes(value?.mode ?? "")
    ? (value?.mode as ScheduleMode)
    : "daily";
  return {
    mode,
    selectedWeekdays: Array.isArray(value?.selectedWeekdays)
      ? value.selectedWeekdays.filter((day) => Number.isInteger(day) && day >= 0 && day <= 6)
      : [...DEFAULT_SCHEDULE.selectedWeekdays],
    weeklyTarget: Math.min(7, Math.max(1, Number(value?.weeklyTarget) || 3)),
    specificDates: Array.isArray(value?.specificDates)
      ? value.specificDates.filter((date) => /^\d{4}-\d{2}-\d{2}$/.test(date))
      : [],
    allowReschedule: value?.allowReschedule !== false,
  };
}

function normalizeHabit(value: Partial<Habit>): Habit | null {
  if (!value.id || !value.name || typeof value.emoji !== "string") return null;
  const legacyDefault = DEFAULT_HABITS.find((habit) => habit.id === value.id)?.schedule;
  return {
    id: value.id,
    name: value.name,
    emoji: value.emoji,
    schedule: normalizeSchedule(value.schedule ?? legacyDefault),
    scheduleHistory: Array.isArray(value.scheduleHistory)
      ? value.scheduleHistory
          .filter((version) => Boolean(version?.effectiveFrom && version?.schedule))
          .map((version) => ({ effectiveFrom: version.effectiveFrom, schedule: normalizeSchedule(version.schedule) }))
          .sort((a, b) => a.effectiveFrom.localeCompare(b.effectiveFrom))
      : undefined,
  };
}

function scheduleForDate(habit: Habit, dateKey: string): HabitSchedule | null {
  if (!habit.scheduleHistory?.length) return habit.schedule;
  const version = [...habit.scheduleHistory]
    .filter((item) => item.effectiveFrom <= dateKey)
    .sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom))[0];
  return version?.schedule ?? null;
}

function isBaseScheduled(schedule: HabitSchedule | null, date: Date) {
  if (!schedule) return false;
  if (schedule.mode === "daily") return true;
  if (schedule.mode === "selected_days") return schedule.selectedWeekdays.includes(date.getDay());
  if (schedule.mode === "specific_dates") return schedule.specificDates.includes(dateToKey(date));
  return false;
}

function isRescheduleTarget(data: TrackerData, habitId: string, dateKey: string) {
  return Object.entries(data.reschedules).some(
    ([source, target]) => source.startsWith(`${habitId}::`) && target === dateKey,
  );
}

function getCellState(data: TrackerData, habit: Habit, dateKey: string): CellState {
  const key = completionKey(habit.id, dateKey);
  if (data.reschedules[key]) return "moved";
  if (data.rests[key]) return "rest";
  if (isRescheduleTarget(data, habit.id, dateKey)) return "target";
  const schedule = scheduleForDate(habit, dateKey);
  if (!schedule) return "off";
  if (schedule.mode === "weekly_target") return "flexible";
  return isBaseScheduled(schedule, parseDateKey(dateKey)) ? "scheduled" : "off";
}

function scheduleLabel(schedule: HabitSchedule | null) {
  if (!schedule) return "Chưa bắt đầu";
  if (schedule.mode === "daily") return "Mỗi ngày";
  if (schedule.mode === "weekly_target") return `${schedule.weeklyTarget} lần / tuần`;
  if (schedule.mode === "specific_dates") return `${schedule.specificDates.length} ngày cụ thể`;
  const labels = WEEKDAY_CHOICES.filter((day) => schedule.selectedWeekdays.includes(day.value)).map((day) => day.label);
  return labels.join(" · ") || "Chưa chọn ngày";
}

function createSeedData(today: Date): TrackerData {
  const completions: Record<string, boolean> = {};
  const wellness: Record<string, number> = {};

  for (let offset = 13; offset >= 0; offset -= 1) {
    const date = addDays(today, -offset);
    const dateKey = dateToKey(date);
    DEFAULT_HABITS.forEach((habit, habitIndex) => {
      const schedule = scheduleForDate(habit, dateKey);
      const eligible = schedule?.mode === "weekly_target" || isBaseScheduled(schedule, date);
      const signal = (date.getDate() * 7 + habitIndex * 5 + date.getMonth()) % 11;
      if (eligible && signal > (habitIndex % 4 === 0 ? 3 : 2)) {
        completions[completionKey(habit.id, dateKey)] = true;
      }
    });
    wellness[dateKey] = 3 + ((date.getDate() + date.getMonth()) % 3);
  }

  return { habits: DEFAULT_HABITS, completions, wellness, rests: {}, reschedules: {} };
}

function loadData(today: Date): TrackerData {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) return createSeedData(today);
    const parsed = JSON.parse(stored) as Partial<TrackerData>;
    if (!Array.isArray(parsed.habits)) return createSeedData(today);
    return {
      habits: parsed.habits.map(normalizeHabit).filter((habit): habit is Habit => Boolean(habit)),
      completions: parsed.completions && typeof parsed.completions === "object" ? parsed.completions : {},
      wellness: parsed.wellness && typeof parsed.wellness === "object" ? parsed.wellness : {},
      rests: parsed.rests && typeof parsed.rests === "object" ? parsed.rests : {},
      reschedules: parsed.reschedules && typeof parsed.reschedules === "object" ? parsed.reschedules : {},
    };
  } catch {
    return createSeedData(today);
  }
}

function getWeekSegments(totalDays: number) {
  const segments: { label: string; length: number }[] = [];
  for (let day = 1; day <= totalDays; day += 7) {
    segments.push({ label: `Tuần ${segments.length + 1}`, length: Math.min(7, totalDays - day + 1) });
  }
  return segments;
}

function isSameMonth(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

function compareMonth(a: Date, b: Date) {
  return a.getFullYear() * 12 + a.getMonth() - (b.getFullYear() * 12 + b.getMonth());
}

function weeklyProgress(data: TrackerData, habit: Habit, anchor: Date, cutoff: Date) {
  const dates = datesOfWeek(anchor).filter((date) => date <= cutoff);
  const schedule = scheduleForDate(habit, dateToKey(anchor)) ?? habit.schedule;
  const rests = dates.filter((date) => data.rests[completionKey(habit.id, dateToKey(date))]).length;
  const goal = Math.max(0, schedule.weeklyTarget - Math.min(rests, schedule.weeklyTarget));
  const completed = dates.filter((date) => data.completions[completionKey(habit.id, dateToKey(date))]).length;
  return { goal, actual: Math.min(completed, goal), rawActual: completed };
}

function habitMonthStat(data: TrackerData, habit: Habit, month: Date, eligibleDays: number) {
  if (!eligibleDays) return { ...habit, goal: 0, actual: 0, left: 0, percent: 0 };
  const eligibleDates = Array.from({ length: eligibleDays }, (_, index) => new Date(month.getFullYear(), month.getMonth(), index + 1));
  const weeklyDates = new Map<string, Date[]>();
  let goal = 0;
  let actual = 0;

  eligibleDates.forEach((date) => {
    const dateKey = dateToKey(date);
    const schedule = scheduleForDate(habit, dateKey);
    if (schedule?.mode === "weekly_target") {
      const key = dateToKey(startOfWeek(date));
      weeklyDates.set(key, [...(weeklyDates.get(key) ?? []), date]);
      return;
    }
    const state = getCellState(data, habit, dateKey);
    if (state === "scheduled" || state === "target") {
      goal += 1;
      if (data.completions[completionKey(habit.id, dateKey)]) actual += 1;
    }
  });

  weeklyDates.forEach((dates) => {
    const schedule = scheduleForDate(habit, dateToKey(dates[0])) ?? habit.schedule;
    const restCount = dates.filter((date) => data.rests[completionKey(habit.id, dateToKey(date))]).length;
    const weekGoal = Math.max(0, schedule.weeklyTarget - Math.min(restCount, schedule.weeklyTarget));
    const weekActual = dates.filter((date) => data.completions[completionKey(habit.id, dateToKey(date))]).length;
    goal += weekGoal;
    actual += Math.min(weekActual, weekGoal);
  });

  const percent = goal ? Math.min(100, Math.round((actual / goal) * 100)) : 0;
  return { ...habit, goal, actual, left: Math.max(goal - actual, 0), percent };
}

function weekSummary(data: TrackerData, anchor: Date, today: Date) {
  const dates = datesOfWeek(anchor).filter((date) => date <= today);
  let goal = 0;
  let actual = 0;
  data.habits.forEach((habit) => {
    const schedule = scheduleForDate(habit, dateToKey(anchor));
    if (!schedule) return;
    if (schedule.mode === "weekly_target") {
      const progress = weeklyProgress(data, habit, anchor, today);
      goal += progress.goal;
      actual += progress.actual;
      return;
    }
    dates.forEach((date) => {
      const dateKey = dateToKey(date);
      const state = getCellState(data, habit, dateKey);
      if (state === "scheduled" || state === "target") {
        goal += 1;
        if (data.completions[completionKey(habit.id, dateKey)]) actual += 1;
      }
    });
  });
  return { goal, actual, percent: goal ? Math.round((actual / goal) * 100) : 0 };
}

export default function Home() {
  const [ready, setReady] = useState(false);
  const [today, setToday] = useState(new Date(2000, 0, 1));
  const [currentMonth, setCurrentMonth] = useState(new Date(2000, 0, 1));
  const [data, setData] = useState<TrackerData>({ habits: DEFAULT_HABITS, completions: {}, wellness: {}, rests: {}, reschedules: {} });
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [editingHabitId, setEditingHabitId] = useState<string | null>(null);
  const [habitName, setHabitName] = useState("");
  const [habitEmoji, setHabitEmoji] = useState("🎯");
  const [scheduleMode, setScheduleMode] = useState<ScheduleMode>("daily");
  const [selectedWeekdays, setSelectedWeekdays] = useState<number[]>([1, 3, 5]);
  const [weeklyTarget, setWeeklyTarget] = useState(3);
  const [specificDates, setSpecificDates] = useState<string[]>([]);
  const [specificDateDraft, setSpecificDateDraft] = useState("");
  const [allowReschedule, setAllowReschedule] = useState(true);
  const [actionTarget, setActionTarget] = useState<ActionTarget>(null);
  const [moveDate, setMoveDate] = useState("");
  const [formError, setFormError] = useState("");
  const [actionError, setActionError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      const localToday = new Date();
      setToday(localToday);
      setCurrentMonth(startOfMonth(localToday));
      setData(loadData(localToday));
      setReady(true);
    }, 0);
    return () => window.clearTimeout(timeout);
  }, []);

  useEffect(() => {
    if (ready) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [data, ready]);

  useEffect(() => {
    if (!notice) return;
    const timeout = window.setTimeout(() => setNotice(""), 2600);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  const totalDays = daysInMonth(currentMonth);
  const days = useMemo(() => Array.from({ length: totalDays }, (_, index) => index + 1), [totalDays]);
  const weekSegments = useMemo(() => getWeekSegments(totalDays), [totalDays]);
  const todayKey = dateToKey(today);
  const selectedMonthComparison = compareMonth(currentMonth, today);
  const eligibleDays = selectedMonthComparison < 0 ? totalDays : selectedMonthComparison === 0 ? today.getDate() : 0;

  const habitStats = useMemo(
    () => data.habits.map((habit) => habitMonthStat(data, habit, currentMonth, eligibleDays)),
    [currentMonth, data, eligibleDays],
  );

  const dailyProgress = useMemo(
    () => days.map((day) => {
      const dateKey = toDateKey(currentMonth.getFullYear(), currentMonth.getMonth(), day);
      if (dateKey > todayKey) return 0;
      let goal = 0;
      let actual = 0;
      data.habits.forEach((habit) => {
        const state = getCellState(data, habit, dateKey);
        const complete = Boolean(data.completions[completionKey(habit.id, dateKey)]);
        if (state === "scheduled" || state === "target" || (state === "flexible" && complete)) {
          goal += 1;
          if (complete) actual += 1;
        }
      });
      return goal ? Math.round((actual / goal) * 100) : 0;
    }),
    [currentMonth, data, days, todayKey],
  );

  const totalGoal = habitStats.reduce((sum, habit) => sum + habit.goal, 0);
  const totalCompleted = habitStats.reduce((sum, habit) => sum + habit.actual, 0);
  const overallPercent = totalGoal ? Math.min(100, Math.round((totalCompleted / totalGoal) * 100)) : 0;
  const sortedHabits = [...habitStats].sort((a, b) => b.percent - a.percent || b.actual - a.actual);
  const bestHabit = sortedHabits[0];

  const currentStreak = useMemo(() => {
    let cursor = startOfWeek(today);
    let summary = weekSummary(data, cursor, today);
    if (endOfWeek(cursor) > today && summary.percent < 70) cursor = addDays(cursor, -7);
    let streak = 0;
    for (let index = 0; index < 20; index += 1) {
      summary = weekSummary(data, cursor, today);
      if (!summary.goal) {
        cursor = addDays(cursor, -7);
        continue;
      }
      if (summary.percent < 70) break;
      streak += 1;
      cursor = addDays(cursor, -7);
    }
    return streak;
  }, [data, today]);

  const monthWellnessValues = days
    .slice(0, eligibleDays)
    .map((day) => data.wellness[toDateKey(currentMonth.getFullYear(), currentMonth.getMonth(), day)])
    .filter((value): value is number => Number.isFinite(value));
  const averageWellness = monthWellnessValues.length
    ? (monthWellnessValues.reduce((sum, value) => sum + value, 0) / monthWellnessValues.length).toFixed(1)
    : "—";
  const focusDay = eligibleDays || 1;
  const focusDateKey = toDateKey(currentMonth.getFullYear(), currentMonth.getMonth(), focusDay);

  const todayItems = useMemo(() => data.habits.flatMap((habit) => {
    const schedule = scheduleForDate(habit, todayKey);
    if (!schedule) return [];
    const state = getCellState(data, habit, todayKey);
    if (schedule.mode === "weekly_target") {
      const progress = weeklyProgress(data, habit, today, today);
      const visible = progress.actual < progress.goal || Boolean(data.completions[completionKey(habit.id, todayKey)]) || state === "rest" || state === "moved";
      return visible ? [{ habit, state, progress }] : [];
    }
    return state !== "off" ? [{ habit, state, progress: null }] : [];
  }), [data, today, todayKey]);

  const todayCompleted = todayItems.filter((item) => data.completions[completionKey(item.habit.id, todayKey)]).length;
  const todayActionable = todayItems.filter((item) => item.state !== "rest" && item.state !== "moved").length;

  const selectedActionHabit = actionTarget ? data.habits.find((habit) => habit.id === actionTarget.habitId) ?? null : null;
  const selectedActionKey = actionTarget ? completionKey(actionTarget.habitId, actionTarget.dateKey) : "";
  const selectedActionState = actionTarget && selectedActionHabit ? getCellState(data, selectedActionHabit, actionTarget.dateKey) : null;

  function isFutureDay(day: number) {
    return toDateKey(currentMonth.getFullYear(), currentMonth.getMonth(), day) > todayKey;
  }

  function changeMonth(offset: number) {
    setCurrentMonth((month) => new Date(month.getFullYear(), month.getMonth() + offset, 1));
  }

  function toggleCompletionByDate(habitId: string, dateKey: string) {
    if (dateKey > todayKey) return;
    const habit = data.habits.find((item) => item.id === habitId);
    if (!habit || getCellState(data, habit, dateKey) === "off") return;
    const key = completionKey(habitId, dateKey);
    setData((current) => {
      const rests = { ...current.rests };
      const reschedules = { ...current.reschedules };
      delete rests[key];
      delete reschedules[key];
      return {
        ...current,
        rests,
        reschedules,
        completions: { ...current.completions, [key]: !current.completions[key] },
      };
    });
  }

  function toggleCompletion(habitId: string, day: number) {
    toggleCompletionByDate(habitId, toDateKey(currentMonth.getFullYear(), currentMonth.getMonth(), day));
  }

  function resetHabitForm(schedule = DEFAULT_SCHEDULE) {
    setScheduleMode(schedule.mode);
    setSelectedWeekdays([...schedule.selectedWeekdays]);
    setWeeklyTarget(schedule.weeklyTarget);
    setSpecificDates([...schedule.specificDates]);
    setSpecificDateDraft("");
    setAllowReschedule(schedule.allowReschedule);
    setFormError("");
  }

  function openAddModal() {
    setModalMode("add");
    setActionTarget(null);
    setEditingHabitId(null);
    setHabitName("");
    setHabitEmoji("🎯");
    resetHabitForm(DEFAULT_SCHEDULE);
  }

  function openEditModal(habit: Habit) {
    setModalMode("edit");
    setActionTarget(null);
    setEditingHabitId(habit.id);
    setHabitName(habit.name);
    setHabitEmoji(habit.emoji);
    resetHabitForm(scheduleForDate(habit, todayKey) ?? habit.schedule);
  }

  function closeModal() {
    setModalMode(null);
    setEditingHabitId(null);
    setActionTarget(null);
    setFormError("");
    setActionError("");
  }

  function toggleWeekday(day: number) {
    setSelectedWeekdays((current) => current.includes(day) ? current.filter((item) => item !== day) : [...current, day]);
  }

  function addSpecificDate() {
    if (!specificDateDraft || specificDates.includes(specificDateDraft)) return;
    setSpecificDates((current) => [...current, specificDateDraft].sort());
    setSpecificDateDraft("");
  }

  function submitHabit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanName = habitName.trim();
    if (!cleanName) return setFormError("Hãy nhập tên thói quen.");
    if (scheduleMode === "selected_days" && !selectedWeekdays.length) return setFormError("Hãy chọn ít nhất một ngày trong tuần.");
    if (scheduleMode === "specific_dates" && !specificDates.length) return setFormError("Hãy thêm ít nhất một ngày cụ thể.");
    if (data.habits.some((habit) => habit.id !== editingHabitId && habit.name.toLocaleLowerCase("vi") === cleanName.toLocaleLowerCase("vi"))) {
      return setFormError("Thói quen này đã có trong danh sách.");
    }

    const nextSchedule: HabitSchedule = normalizeSchedule({ mode: scheduleMode, selectedWeekdays, weeklyTarget, specificDates, allowReschedule });
    if (modalMode === "add") {
      if (data.habits.length >= MAX_HABITS) return setFormError(`Bạn có thể theo dõi tối đa ${MAX_HABITS} thói quen.`);
      const newHabit: Habit = {
        id: `habit-${Date.now()}`,
        name: cleanName,
        emoji: habitEmoji || "🎯",
        schedule: nextSchedule,
        scheduleHistory: [{ effectiveFrom: todayKey, schedule: nextSchedule }],
      };
      setData((current) => ({ ...current, habits: [...current.habits, newHabit] }));
      setNotice("Đã thêm thói quen với lịch riêng");
    } else if (editingHabitId) {
      setData((current) => ({
        ...current,
        habits: current.habits.map((habit) => {
          if (habit.id !== editingHabitId) return habit;
          const currentSchedule = scheduleForDate(habit, todayKey) ?? habit.schedule;
          const changed = JSON.stringify(currentSchedule) !== JSON.stringify(nextSchedule);
          let history = habit.scheduleHistory;
          if (changed) {
            history = history?.length
              ? [...history.filter((version) => version.effectiveFrom !== todayKey), { effectiveFrom: todayKey, schedule: nextSchedule }]
              : [{ effectiveFrom: "1970-01-01", schedule: habit.schedule }, { effectiveFrom: todayKey, schedule: nextSchedule }];
          }
          return { ...habit, name: cleanName, emoji: habitEmoji || "🎯", schedule: nextSchedule, scheduleHistory: history };
        }),
      }));
      setNotice("Đã cập nhật; dữ liệu cũ được giữ nguyên");
    }
    closeModal();
  }

  function deleteHabit(habit: Habit) {
    if (!window.confirm(`Xóa “${habit.name}” và toàn bộ dữ liệu đã đánh dấu?`)) return;
    setData((current) => ({
      ...current,
      habits: current.habits.filter((item) => item.id !== habit.id),
      completions: Object.fromEntries(Object.entries(current.completions).filter(([key]) => !key.startsWith(`${habit.id}::`))),
      rests: Object.fromEntries(Object.entries(current.rests).filter(([key]) => !key.startsWith(`${habit.id}::`))),
      reschedules: Object.fromEntries(Object.entries(current.reschedules).filter(([key]) => !key.startsWith(`${habit.id}::`))),
    }));
    setNotice("Đã xóa thói quen");
  }

  function openDayActions(habitId: string, dateKey: string) {
    const habit = data.habits.find((item) => item.id === habitId);
    if (!habit) return;
    setModalMode(null);
    setActionTarget({ habitId, dateKey });
    setMoveDate(data.reschedules[completionKey(habitId, dateKey)] ?? "");
    setActionError("");
  }

  function markRest() {
    if (!actionTarget) return;
    const key = completionKey(actionTarget.habitId, actionTarget.dateKey);
    setData((current) => {
      const reschedules = { ...current.reschedules };
      delete reschedules[key];
      return { ...current, reschedules, completions: { ...current.completions, [key]: false }, rests: { ...current.rests, [key]: true } };
    });
    setNotice("Đã ghi nhận nghỉ hợp lệ");
    closeModal();
  }

  function applyReschedule(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!actionTarget || !selectedActionHabit) return;
    const requestedDate = String(new FormData(event.currentTarget).get("move-date") ?? "");
    const schedule = scheduleForDate(selectedActionHabit, actionTarget.dateKey);
    if (!schedule?.allowReschedule) return setActionError("Thói quen này không cho phép dời lịch.");
    if (!requestedDate || requestedDate === actionTarget.dateKey) return setActionError("Hãy chọn một ngày khác trong cùng tuần.");
    const sourceDate = parseDateKey(actionTarget.dateKey);
    const min = dateToKey(startOfWeek(sourceDate));
    const max = dateToKey(endOfWeek(sourceDate));
    if (requestedDate < min || requestedDate > max) return setActionError("Chỉ có thể dời trong cùng tuần.");
    const key = completionKey(actionTarget.habitId, actionTarget.dateKey);
    setData((current) => {
      const rests = { ...current.rests };
      delete rests[key];
      return { ...current, rests, completions: { ...current.completions, [key]: false }, reschedules: { ...current.reschedules, [key]: requestedDate } };
    });
    setNotice(`Đã dời sang ${requestedDate.split("-").reverse().join("/")}`);
    closeModal();
  }

  function clearDayState() {
    if (!actionTarget) return;
    const key = completionKey(actionTarget.habitId, actionTarget.dateKey);
    setData((current) => {
      const rests = { ...current.rests };
      const reschedules = { ...current.reschedules };
      delete rests[key];
      delete reschedules[key];
      Object.entries(reschedules).forEach(([source, target]) => {
        if (source.startsWith(`${actionTarget.habitId}::`) && target === actionTarget.dateKey) delete reschedules[source];
      });
      return { ...current, rests, reschedules, completions: { ...current.completions, [key]: false } };
    });
    setNotice("Đã xóa trạng thái của ngày");
    closeModal();
  }

  function resetMonth() {
    const label = `${MONTH_LABELS[currentMonth.getMonth()]} ${currentMonth.getFullYear()}`;
    if (!window.confirm(`Xóa toàn bộ dữ liệu đánh dấu của ${label}?`)) return;
    const prefix = `${monthKey(currentMonth)}-`;
    setData((current) => ({
      ...current,
      completions: Object.fromEntries(Object.entries(current.completions).filter(([key]) => !key.split("::")[1]?.startsWith(prefix))),
      rests: Object.fromEntries(Object.entries(current.rests).filter(([key]) => !key.split("::")[1]?.startsWith(prefix))),
      reschedules: Object.fromEntries(Object.entries(current.reschedules).filter(([key, target]) => !key.split("::")[1]?.startsWith(prefix) && !target.startsWith(prefix))),
      wellness: Object.fromEntries(Object.entries(current.wellness).filter(([key]) => !key.startsWith(prefix))),
    }));
    setNotice("Đã làm mới dữ liệu tháng");
  }

  function exportCsv() {
    const header = ["Thói quen", "Lịch", ...days.map(String), "Mục tiêu", "Hoàn thành", "%"];
    const rows = habitStats.map((habit) => [
      `${habit.emoji} ${habit.name}`,
      scheduleLabel(scheduleForDate(habit, focusDateKey) ?? habit.schedule),
      ...days.map((day) => {
        const dateKey = toDateKey(currentMonth.getFullYear(), currentMonth.getMonth(), day);
        const key = completionKey(habit.id, dateKey);
        const state = getCellState(data, habit, dateKey);
        if (data.completions[key]) return "Hoàn thành";
        if (state === "rest") return "Nghỉ";
        if (state === "moved") return `Dời sang ${data.reschedules[key]}`;
        if (state === "off") return "Không lên lịch";
        return "";
      }),
      String(habit.goal), String(habit.actual), `${habit.percent}%`,
    ]);
    const csv = [header, ...rows].map((row) => row.map((cell) => `"${cell.replaceAll('"', '""')}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `habit-tracker-${monthKey(currentMonth)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
    setNotice("Đã xuất báo cáo CSV");
  }

  function setWellness(value: number) {
    if (selectedMonthComparison > 0) return;
    setData((current) => ({ ...current, wellness: { ...current.wellness, [focusDateKey]: value } }));
  }

  function handleModalKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") closeModal();
  }

  if (!ready) {
    return <main className="loading-shell" aria-label="Đang tải Habit Tracker"><div className="loading-mark">TV</div><p>Đang chuẩn bị bảng thói quen…</p></main>;
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="#top" aria-label="Thiên Vũ Habit Tracker">
          <span className="brand-mark">TV</span>
          <span><strong>THIÊN VŨ</strong><small>PERSONAL HABIT SYSTEM</small></span>
        </a>
        <nav className="top-actions" aria-label="Tác vụ chính">
          <button className="text-button mobile-hide" onClick={exportCsv} type="button">Xuất CSV ↗</button>
          <button className="primary-button" onClick={openAddModal} type="button"><span aria-hidden="true">＋</span> Thêm thói quen</button>
        </nav>
      </header>

      <div className="page-wrap" id="top">
        <section className="hero-panel">
          <div className="hero-copy">
            <p className="eyebrow">BẢNG ĐIỀU KHIỂN CÁ NHÂN / {currentMonth.getFullYear()}</p>
            <h1>Linh hoạt theo lịch,<span> nhất quán với mục tiêu.</span></h1>
            <p className="hero-description">Mỗi thói quen có nhịp riêng. Chỉ những lần thực sự được lên lịch mới được tính vào tiến độ của bạn.</p>
            <div className="month-control" aria-label="Chọn tháng">
              <button onClick={() => changeMonth(-1)} aria-label="Tháng trước" type="button">←</button>
              <div><strong>{MONTH_LABELS[currentMonth.getMonth()]}</strong><span>{currentMonth.getFullYear()}</span></div>
              <button onClick={() => changeMonth(1)} aria-label="Tháng sau" type="button">→</button>
              {!isSameMonth(currentMonth, today) && <button className="today-button" onClick={() => setCurrentMonth(startOfMonth(today))} type="button">Hôm nay</button>}
            </div>
          </div>
          <div className="hero-progress" aria-label={`Tiến độ tổng ${overallPercent}%`}>
            <div className="progress-ring" style={{ background: `conic-gradient(#c9ff63 ${overallPercent * 3.6}deg, rgba(255,255,255,.13) 0deg)` }}>
              <div><strong>{overallPercent}%</strong><span>HOÀN THÀNH</span></div>
            </div>
            <div className="hero-progress-copy"><p>THÁNG NÀY</p><strong>{totalCompleted}</strong><span>/ {totalGoal} lượt thực sự được lên lịch</span></div>
          </div>
        </section>

        <section className="panel today-panel" aria-labelledby="today-heading">
          <div className="today-header">
            <div>
              <p className="section-kicker">00 / HÔM NAY · {todayKey.split("-").reverse().join("/")}</p>
              <h2 id="today-heading">Việc cần làm hôm nay</h2>
              <p>Chỉ hiển thị thói quen đến hạn hoặc mục tiêu tuần chưa hoàn thành.</p>
            </div>
            <div className="today-score"><strong>{todayCompleted}</strong><span>/ {todayActionable} hoàn thành</span></div>
          </div>
          <div className="today-list">
            {todayItems.map(({ habit, state, progress }) => {
              const complete = Boolean(data.completions[completionKey(habit.id, todayKey)]);
              const status = complete
                ? "Đã hoàn thành"
                : state === "rest"
                  ? "Nghỉ hợp lệ"
                  : state === "moved"
                    ? `Đã dời sang ${data.reschedules[completionKey(habit.id, todayKey)]?.split("-").reverse().join("/")}`
                    : progress
                      ? `${progress.actual}/${progress.goal} lần trong tuần`
                      : state === "target"
                        ? "Được dời tới hôm nay"
                        : "Cần thực hiện";
              return (
                <article className={`today-item ${state}${complete ? " done" : ""}`} key={habit.id}>
                  <span className="today-emoji" aria-hidden="true">{habit.emoji}</span>
                  <div className="today-item-copy"><strong>{habit.name}</strong><span>{status}</span></div>
                  <button className={`quick-check${complete ? " checked" : ""}`} onClick={() => toggleCompletionByDate(habit.id, todayKey)} type="button" aria-label={`${complete ? "Bỏ hoàn thành" : "Hoàn thành"} ${habit.name}`} disabled={state === "moved"}>✓</button>
                  <button className="more-button" onClick={() => openDayActions(habit.id, todayKey)} type="button" aria-label={`Tùy chọn ${habit.name}`}>•••</button>
                </article>
              );
            })}
            {!todayItems.length && <div className="today-empty"><span>✓</span><div><strong>Hôm nay đã gọn gàng</strong><p>Không còn thói quen nào đến hạn.</p></div></div>}
          </div>
        </section>

        <section className="metrics-grid" aria-label="Tổng quan">
          <article className="metric-card accent-card"><div className="metric-topline"><span>TIẾN ĐỘ CHUNG</span><span>↗</span></div><strong>{overallPercent}%</strong><p>Tính trên lịch thực tế.</p></article>
          <article className="metric-card"><div className="metric-topline"><span>ĐÃ HOÀN THÀNH</span><span>✓</span></div><strong>{totalCompleted}</strong><p>trên {totalGoal} lượt mục tiêu</p></article>
          <article className="metric-card"><div className="metric-topline"><span>CHUỖI HIỆN TẠI</span><span>↯</span></div><strong>{currentStreak}</strong><p>tuần đạt từ 70% mục tiêu</p></article>
          <article className="metric-card best-card"><div className="metric-topline"><span>THÓI QUEN TỐT NHẤT</span><span>★</span></div><strong className="best-habit-name">{bestHabit ? `${bestHabit.emoji} ${bestHabit.name}` : "Chưa có dữ liệu"}</strong><p>{bestHabit ? `${bestHabit.percent}% hoàn thành` : "Hãy thêm thói quen đầu tiên"}</p></article>
        </section>

        <section className="dashboard-grid">
          <article className="panel chart-panel">
            <div className="panel-heading"><div><p className="section-kicker">01 / NHỊP ĐỘ</p><h2>Tiến độ theo ngày</h2></div><span className="panel-note">THEO LỊCH THỰC TẾ</span></div>
            <div className="bar-chart" role="img" aria-label="Biểu đồ tiến độ từng ngày">
              <div className="chart-guides" aria-hidden="true"><span>100%</span><span>50%</span><span>0%</span></div>
              <div className="bars" style={{ gridTemplateColumns: `repeat(${totalDays}, minmax(5px, 1fr))` }}>
                {dailyProgress.map((percent, index) => {
                  const day = index + 1;
                  const future = isFutureDay(day);
                  return <div className="bar-column" key={day}><div className="bar-track"><div className={`bar-fill${future ? " future" : ""}`} style={{ height: `${future ? 0 : Math.max(percent, 2)}%` }} title={`Ngày ${day}: ${future ? "chưa tới" : `${percent}%`}`} /></div><span>{day === 1 || day % 3 === 0 || day === totalDays ? day : ""}</span></div>;
                })}
              </div>
            </div>
          </article>
          <article className="panel wellness-panel">
            <div className="panel-heading"><div><p className="section-kicker">02 / WELLNESS</p><h2>Năng lượng</h2></div><strong>{averageWellness}<small>/5</small></strong></div>
            <p className="wellness-copy">Mức năng lượng ngày {focusDay}. Chọn nhanh để theo dõi mối liên hệ giữa trạng thái và thói quen.</p>
            <div className="wellness-scale" aria-label="Mức năng lượng từ 1 đến 5">
              {[1, 2, 3, 4, 5].map((value) => <button key={value} type="button" className={data.wellness[focusDateKey] === value ? "active" : ""} onClick={() => setWellness(value)} disabled={selectedMonthComparison > 0} aria-label={`Năng lượng mức ${value}`} aria-pressed={data.wellness[focusDateKey] === value}>{value}</button>)}
            </div>
            <div className="wellness-labels"><span>THẤP</span><span>RẤT TỐT</span></div>
          </article>
        </section>

        <section className="panel tracker-panel">
          <div className="panel-heading tracker-heading"><div><p className="section-kicker">03 / TRACKER</p><h2>Lịch thói quen linh hoạt</h2></div><div className="tracker-tools"><span>{data.habits.length} THÓI QUEN</span><button className="text-button" onClick={resetMonth} type="button">Làm mới tháng</button></div></div>
          {data.habits.length ? (
            <div className="table-scroll" tabIndex={0} aria-label="Bảng theo dõi thói quen">
              <table className="habit-table">
                <thead>
                  <tr className="week-row"><th rowSpan={3} className="habit-column-header">THÓI QUEN / LỊCH</th>{weekSegments.map((week) => <th colSpan={week.length} key={week.label}>{week.label}</th>)}</tr>
                  <tr className="weekday-row">{days.map((day) => <th key={day}>{DAY_LABELS[new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day).getDay()]}</th>)}</tr>
                  <tr className="date-row">{days.map((day) => <th className={toDateKey(currentMonth.getFullYear(), currentMonth.getMonth(), day) === todayKey ? "today" : ""} key={day}>{day}</th>)}</tr>
                </thead>
                <tbody>
                  {data.habits.map((habit) => (
                    <tr key={habit.id}>
                      <th scope="row" className="habit-name-cell"><span className="habit-emoji">{habit.emoji}</span><span className="habit-name-stack"><span className="habit-name">{habit.name}</span><small>{scheduleLabel(scheduleForDate(habit, focusDateKey) ?? habit.schedule)}</small></span><span className="row-actions"><button onClick={() => openEditModal(habit)} type="button" aria-label={`Sửa ${habit.name}`}>✎</button><button onClick={() => deleteHabit(habit)} type="button" aria-label={`Xóa ${habit.name}`}>×</button></span></th>
                      {days.map((day) => {
                        const dateKey = toDateKey(currentMonth.getFullYear(), currentMonth.getMonth(), day);
                        const key = completionKey(habit.id, dateKey);
                        const checked = Boolean(data.completions[key]);
                        const future = isFutureDay(day);
                        const state = getCellState(data, habit, dateKey);
                        const disabled = future || state === "off";
                        const symbol = checked ? "✓" : state === "rest" ? "–" : state === "moved" ? "→" : state === "target" ? "↪" : "";
                        const stateLabel = checked ? "đã hoàn thành" : state === "off" ? "không được lên lịch" : state === "rest" ? "nghỉ hợp lệ" : state === "moved" ? "đã dời lịch" : state === "flexible" ? "linh hoạt trong tuần" : "chưa hoàn thành";
                        return <td key={day} className={`${future ? "future-cell " : ""}${state}-cell`}><button type="button" className={`habit-check ${state}${checked ? " checked" : ""}`} onClick={() => toggleCompletion(habit.id, day)} disabled={disabled} aria-label={`${habit.name}, ngày ${day}: ${stateLabel}`} aria-pressed={checked}>{symbol}</button></td>;
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <div className="empty-state"><span>＋</span><h3>Bắt đầu với một thói quen nhỏ</h3><p>Thêm thói quen đầu tiên để tạo lịch riêng.</p><button className="primary-button" type="button" onClick={openAddModal}>Thêm thói quen</button></div>}
          <div className="tracker-footer"><p><span className="legend-box complete" /> Hoàn thành</p><p><span className="legend-box" /> Cần thực hiện</p><p><span className="legend-box flexible" /> Linh hoạt</p><p><span className="legend-box off" /> Không lên lịch</p><p><span className="legend-box rest" /> Nghỉ / dời</p><span>Chỉ ô được lên lịch mới tính vào tiến độ</span></div>
        </section>

        <section className="analysis-layout">
          <article className="panel analysis-panel">
            <div className="panel-heading"><div><p className="section-kicker">04 / PHÂN TÍCH</p><h2>Chi tiết theo lịch thực tế</h2></div><span className="panel-note">CẬP NHẬT TỨC THÌ</span></div>
            <div className="analysis-table-wrap"><table className="analysis-table"><thead><tr><th>Thói quen</th><th>Lịch</th><th>Mục tiêu</th><th>Đã làm</th><th>Còn lại</th><th>Tiến độ</th><th>%</th></tr></thead><tbody>
              {habitStats.map((habit) => <tr key={habit.id}><th scope="row"><span>{habit.emoji}</span>{habit.name}</th><td className="schedule-cell">{scheduleLabel(scheduleForDate(habit, focusDateKey) ?? habit.schedule)}</td><td>{habit.goal}</td><td>{habit.actual}</td><td>{habit.left}</td><td><div className="mini-progress" aria-label={`${habit.percent}%`}><span style={{ width: `${habit.percent}%` }} /></div></td><td><strong>{habit.percent}%</strong></td></tr>)}
            </tbody></table></div>
          </article>
          <aside className="panel ranking-panel"><div className="panel-heading"><div><p className="section-kicker">05 / XẾP HẠNG</p><h2>Top thói quen</h2></div></div><ol className="ranking-list">
            {sortedHabits.slice(0, 10).map((habit, index) => <li key={habit.id}><span className="rank-number">{pad(index + 1)}</span><span className="rank-emoji">{habit.emoji}</span><div><strong>{habit.name}</strong><span>{habit.actual}/{habit.goal} lượt</span></div><b>{habit.percent}%</b></li>)}
            {!sortedHabits.length && <li className="rank-empty">Chưa có dữ liệu.</li>}
          </ol></aside>
        </section>

        <footer className="footer"><div className="brand footer-brand"><span className="brand-mark">TV</span><span><strong>THIÊN VŨ</strong><small>PERSONAL HABIT SYSTEM</small></span></div><p>Tiến bộ không cần hoàn hảo. Chỉ cần phù hợp và được lặp lại.</p><button className="text-button" onClick={exportCsv} type="button">Xuất dữ liệu ↗</button></footer>
      </div>

      {modalMode && (
        <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) closeModal(); }} onKeyDown={handleModalKeyDown}>
          <div className="modal habit-modal" role="dialog" aria-modal="true" aria-labelledby="habit-modal-title">
            <button className="modal-close" type="button" onClick={closeModal} aria-label="Đóng">×</button>
            <p className="section-kicker">THIẾT LẬP THÓI QUEN</p><h2 id="habit-modal-title">{modalMode === "add" ? "Thêm thói quen mới" : "Chỉnh sửa thói quen"}</h2><p className="modal-intro">Đặt lịch phù hợp với nhịp sống. Thay đổi mới áp dụng từ hôm nay và không xóa dữ liệu cũ.</p>
            <form onSubmit={submitHabit}>
              <div className="habit-basic-fields"><div><label htmlFor="habit-name">Tên thói quen</label><input id="habit-name" value={habitName} onChange={(event) => setHabitName(event.target.value)} placeholder="Ví dụ: Đọc 20 phút" maxLength={48} autoFocus /></div></div>
              <fieldset><legend>Biểu tượng</legend><div className="emoji-picker">{EMOJI_PRESETS.map((emoji) => <button key={emoji} type="button" className={habitEmoji === emoji ? "selected" : ""} onClick={() => setHabitEmoji(emoji)} aria-label={`Chọn biểu tượng ${emoji}`} aria-pressed={habitEmoji === emoji}>{emoji}</button>)}</div></fieldset>
              <fieldset className="schedule-fieldset"><legend>Tần suất</legend><div className="schedule-modes">
                {([
                  ["daily", "Mỗi ngày", "Lặp lại hằng ngày"],
                  ["selected_days", "Ngày được chọn", "Ví dụ T2 · T4 · T6"],
                  ["weekly_target", "X lần mỗi tuần", "Không bắt buộc ngày"],
                  ["specific_dates", "Ngày cụ thể", "Một hoặc nhiều ngày"],
                ] as [ScheduleMode, string, string][]).map(([mode, label, help]) => <label className={scheduleMode === mode ? "selected" : ""} key={mode}><input type="radio" name="schedule-mode" value={mode} checked={scheduleMode === mode} onChange={() => setScheduleMode(mode)} /><span><strong>{label}</strong><small>{help}</small></span></label>)}
              </div></fieldset>
              {scheduleMode === "selected_days" && <fieldset className="schedule-options"><legend>Ngày thực hiện</legend><div className="weekday-picker">{WEEKDAY_CHOICES.map((day) => <button type="button" key={day.value} className={selectedWeekdays.includes(day.value) ? "selected" : ""} onClick={() => toggleWeekday(day.value)} aria-pressed={selectedWeekdays.includes(day.value)}>{day.label}</button>)}</div></fieldset>}
              {scheduleMode === "weekly_target" && <div className="weekly-target-field"><label htmlFor="weekly-target">Mục tiêu mỗi tuần</label><div><input id="weekly-target" type="number" min="1" max="7" value={weeklyTarget} onChange={(event) => setWeeklyTarget(Math.min(7, Math.max(1, Number(event.target.value))))} /><span>lần / tuần</span></div></div>}
              {scheduleMode === "specific_dates" && <fieldset className="schedule-options"><legend>Ngày cụ thể</legend><div className="specific-date-add"><input type="date" value={specificDateDraft} onChange={(event) => setSpecificDateDraft(event.target.value)} /><button type="button" className="secondary-button" onClick={addSpecificDate}>Thêm ngày</button></div><div className="date-chips">{specificDates.map((date) => <button type="button" key={date} onClick={() => setSpecificDates((current) => current.filter((item) => item !== date))}>{date.split("-").reverse().join("/")} ×</button>)}</div></fieldset>}
              <label className="switch-row"><span><strong>Cho phép dời lịch</strong><small>Chuyển sang ngày khác trong cùng tuần</small></span><input type="checkbox" checked={allowReschedule} onChange={(event) => setAllowReschedule(event.target.checked)} /></label>
              {formError && <p className="form-error" role="alert">{formError}</p>}
              <div className="modal-actions"><button type="button" className="secondary-button" onClick={closeModal}>Hủy</button><button type="submit" className="primary-button">{modalMode === "add" ? "Thêm thói quen" : "Lưu thay đổi"}</button></div>
            </form>
          </div>
        </div>
      )}

      {actionTarget && selectedActionHabit && (
        <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) closeModal(); }} onKeyDown={handleModalKeyDown}>
          <div className="modal action-modal" role="dialog" aria-modal="true" aria-labelledby="day-action-title">
            <button className="modal-close" type="button" onClick={closeModal} aria-label="Đóng">×</button>
            <p className="section-kicker">TÙY CHỌN NGÀY {actionTarget.dateKey.split("-").reverse().join("/")}</p><h2 id="day-action-title">{selectedActionHabit.emoji} {selectedActionHabit.name}</h2><p className="modal-intro">Hoàn thành, nghỉ hợp lệ hoặc chuyển việc sang một ngày khác trong cùng tuần.</p>
            <div className="action-grid">
              <button type="button" className="action-choice complete-action" onClick={() => { toggleCompletionByDate(actionTarget.habitId, actionTarget.dateKey); closeModal(); }}><span>✓</span><div><strong>{data.completions[selectedActionKey] ? "Bỏ hoàn thành" : "Đánh dấu hoàn thành"}</strong><small>Cập nhật tiến độ ngay</small></div></button>
              <button type="button" className="action-choice" onClick={markRest}><span>–</span><div><strong>Nghỉ hợp lệ</strong><small>Không tính là bỏ lỡ</small></div></button>
            </div>
            {selectedActionHabit.schedule.allowReschedule && <form className="move-box" onSubmit={applyReschedule}><label htmlFor="move-date">Dời sang ngày khác trong tuần</label><div><input id="move-date" name="move-date" type="date" value={moveDate} min={dateToKey(startOfWeek(parseDateKey(actionTarget.dateKey)))} max={dateToKey(endOfWeek(parseDateKey(actionTarget.dateKey)))} onChange={(event) => setMoveDate(event.target.value)} /><button className="primary-button" type="submit">Dời lịch</button></div>{selectedActionState === "moved" && <p>Hiện đang dời sang {data.reschedules[selectedActionKey]?.split("-").reverse().join("/")}.</p>}</form>}
            {actionError && <p className="form-error" role="alert">{actionError}</p>}
            <div className="action-footer"><button type="button" className="text-button" onClick={clearDayState}>Xóa trạng thái / hoàn tác</button><button type="button" className="secondary-button" onClick={closeModal}>Đóng</button></div>
          </div>
        </div>
      )}

      {notice && <div className="toast" role="status"><span>✓</span>{notice}</div>}
    </main>
  );
}
