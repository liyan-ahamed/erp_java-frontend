const timeOfDay = () => {
  const hour = new Date().getHours();
  return hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
};

/** "Good morning, Dr Kumar": first name, keeping a title with the surname ("Dr Kumar", "Prof. Nair"). */
export const dashboardGreeting = (name: string | undefined) => {
  const nameParts = name?.trim().split(/\s+/) ?? [];
  const firstName = /^(dr|prof|mr|mrs|ms)\.?$/i.test(nameParts[0] ?? '') ? nameParts.slice(0, 2).join(' ') : nameParts[0];
  return `${timeOfDay()}${firstName ? `, ${firstName}` : ''}`;
};
