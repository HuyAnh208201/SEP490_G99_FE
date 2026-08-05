import StatCard from '../ui/StatCard.jsx';

export default function DashboardKpiGrid({ items, columnsClass = 'sm:grid-cols-2 xl:grid-cols-4' }) {
  return (
    <div className={`grid gap-3 w-full ${columnsClass}`}>
      {items.map((item) => (
        <StatCard
          key={item.key || item.label}
          label={item.label}
          value={item.value}
          hint={item.hint}
          icon={item.icon}
          trend={item.trend}
        />
      ))}
    </div>
  );
}
