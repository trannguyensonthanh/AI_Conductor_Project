import { useEffect } from 'react';
import { useAppStore } from '@/stores/useAppStore';
import { StatsCards } from '@/components/dashboard/StatsCards';
import { SensorChart } from '@/components/dashboard/SensorChart';
import { GestureLog } from '@/components/dashboard/GestureLog';
import { DigitalTwin } from '@/components/dashboard/DigitalTwin';
import { MicChart } from '@/components/dashboard/MicChart';
import { motion } from 'framer-motion';

export default function Dashboard() {

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-4 lg:space-y-6"
    >
      <StatsCards />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
        <div className="lg:col-span-2">
          <SensorChart />
        </div>
        <GestureLog />
      </div>
      <MicChart />
      <DigitalTwin />
    </motion.div>
  );
}