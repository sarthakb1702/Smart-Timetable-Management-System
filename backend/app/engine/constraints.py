from typing import List, Tuple, Dict, Any, Optional
from datetime import datetime, time


def time_to_minutes(t_val: str) -> int:
    """Converts 'HH:MM:SS' or 'HH:MM' string to minutes from midnight."""
    clean_val = t_val.strip()
    parts = clean_val.split(":")
    hours = int(parts[0])
    mins = int(parts[1])
    return hours * 60 + mins


def minutes_to_time(total_minutes: int) -> str:
    """Converts minutes from midnight to 'HH:MM:SS' string."""
    hours = total_minutes // 60
    mins = total_minutes % 60
    return f"{hours:02d}:{mins:02d}:00"


def is_time_overlapping(start1: str, end1: str, start2: str, end2: str) -> bool:
    """Checks whether two (start, end) time intervals strictly overlap."""
    s1 = time_to_minutes(start1)
    e1 = time_to_minutes(end1)
    s2 = time_to_minutes(start2)
    e2 = time_to_minutes(end2)
    return max(s1, s2) < min(e1, e2)


class DaySlotGrid:
    """
    Discretizes working days and working hours into indexed slots.
    Example: 6 days (Mon-Sat), 8:00 AM to 5:00 PM in 60-minute slices = 9 slots/day.
    """

    def __init__(
        self,
        working_days: List[int] = [1, 2, 3, 4, 5, 6],
        day_start_time: str = "08:00:00",
        day_end_time: str = "17:00:00",
        slot_duration_minutes: int = 60,
    ):
        self.working_days = sorted(working_days)
        self.day_start_minutes = time_to_minutes(day_start_time)
        self.day_end_minutes = time_to_minutes(day_end_time)
        self.slot_duration_minutes = slot_duration_minutes

        self.slots_per_day = (
            self.day_end_minutes - self.day_start_minutes
        ) // self.slot_duration_minutes

        self.intervals: List[Tuple[str, str]] = []
        for i in range(self.slots_per_day):
            s_min = self.day_start_minutes + i * self.slot_duration_minutes
            e_min = s_min + self.slot_duration_minutes
            self.intervals.append((minutes_to_time(s_min), minutes_to_time(e_min)))

    def get_slot_interval(self, slot_idx: int) -> Tuple[str, str]:
        """Returns (start_time, end_time) for a given slot index of the day."""
        if 0 <= slot_idx < len(self.intervals):
            return self.intervals[slot_idx]
        raise IndexError(f"Slot index {slot_idx} is out of bounds (0 to {len(self.intervals)-1})")

    def find_slot_indices_for_window(self, start_time: str, end_time: str) -> List[int]:
        """Returns all slot indices in a day that overlap with given start_time and end_time."""
        overlapping = []
        for idx, (s, e) in enumerate(self.intervals):
            if is_time_overlapping(start_time, end_time, s, e):
                overlapping.append(idx)
        return overlapping


# Standard Constraint Codes
CLASH_FACULTY_DOUBLE_BOOKED = "CLASH_FACULTY_DOUBLE_BOOKED"
CLASH_ROOM_DOUBLE_BOOKED = "CLASH_ROOM_DOUBLE_BOOKED"
CLASH_DIVISION_OVERLAP = "CLASH_DIVISION_OVERLAP"
CLASH_BATCH_CONCURRENCY = "CLASH_BATCH_CONCURRENCY"
CLASH_LUNCH_OVERLAP = "CLASH_LUNCH_OVERLAP"
CLASH_LOCKED_SLOT_OVERLAP = "CLASH_LOCKED_SLOT_OVERLAP"
CLASH_FACULTY_WORKLOAD_EXCEEDED = "CLASH_FACULTY_WORKLOAD_EXCEEDED"
CLASH_MAX_THEORY_PER_DAY = "CLASH_MAX_THEORY_PER_DAY"
CLASH_ROOM_TYPE_MISMATCH = "CLASH_ROOM_TYPE_MISMATCH"
