export function formatNumber(value: number, decimals = 0): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

export function formatWeight(kg: number): string {
  if (kg >= 1000) {
    return `${formatNumber(kg / 1000, 2)} t`;
  }

  const decimals = Number.isInteger(kg) ? 0 : 2;
  return `${formatNumber(kg, decimals)} kg`;
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  if (!dateString || Number.isNaN(date.getTime())) {
    return '-';
  }

  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

export function formatDateTime(dateString: string): string {
  const date = new Date(dateString);
  if (!dateString || Number.isNaN(date.getTime())) {
    return '-';
  }
  const datePart = new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);

  const timePart = new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);

  return `${datePart}, ${timePart}`;
}

export function toTitleCase(str: string): string {
  return str
    .replace(/[_-]+/g, ' ')
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function getRoleBadgeColor(role: string): 'green' | 'blue' | 'amber' | 'red' | 'gray' | 'purple' {
  const colorByRole: Record<string, 'green' | 'blue' | 'amber' | 'red' | 'gray' | 'purple'> = {
    system_admin: 'red',
    management_viewer: 'gray',
    procurement_officer: 'blue',
    production_supervisor: 'purple',
    qc_inspector: 'amber',
    warehouse_officer: 'green',
    sales_executive: 'blue',
    export_coordinator: 'purple',
  };

  return colorByRole[role] ?? 'gray';
}
