import React, { useState, useEffect } from 'react';
import {
  ArrowPathIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  CloudIcon,
} from '@heroicons/react/24/outline';

type SyncState = 'syncing' | 'synced' | 'offline' | 'error';

const SyncIndicator: React.FC = () => {
  const [syncState, setSyncState] = useState<SyncState>('synced');
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [isManualSyncing, setIsManualSyncing] = useState(false);

  useEffect(() => {
    // Simulate sync state monitoring
    const interval = setInterval(() => {
      // Check sync status (would be from Electron IPC in real implementation)
      checkSyncStatus();
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const checkSyncStatus = async () => {
    // In production, this would call window.electronAPI.sync.getStatus()
    // For now, simulate based on server availability
    try {
      const response = await fetch('http://localhost:3001/api/health', {
        signal: AbortSignal.timeout(2000),
      });
      
      if (response.ok) {
        if (syncState !== 'synced' && syncState !== 'syncing') {
          setSyncState('synced');
          setLastSyncTime(new Date());
        }
      } else {
        setSyncState('error');
      }
    } catch (error) {
      setSyncState('offline');
    }
  };

  const handleManualSync = async () => {
    setIsManualSyncing(true);
    setSyncState('syncing');
    
    try {
      await window.electronAPI.sync.manualSync();
      setSyncState('synced');
      setLastSyncTime(new Date());
      
      setTimeout(() => {
        setIsManualSyncing(false);
      }, 500);
    } catch (error) {
      setSyncState('error');
      setIsManualSyncing(false);
    }
  };

  const getStateConfig = () => {
    switch (syncState) {
      case 'syncing':
        return {
          icon: ArrowPathIcon,
          text: 'Syncing...',
          color: 'text-blue-600',
          bgColor: 'bg-blue-50',
          iconClass: 'animate-spin',
        };
      case 'synced':
        return {
          icon: CheckCircleIcon,
          text: 'Synced',
          color: 'text-green-600',
          bgColor: 'bg-green-50',
          iconClass: '',
        };
      case 'offline':
        return {
          icon: ExclamationTriangleIcon,
          text: 'Offline',
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-50',
          iconClass: '',
        };
      case 'error':
        return {
          icon: ExclamationTriangleIcon,
          text: 'Error',
          color: 'text-red-600',
          bgColor: 'bg-red-50',
          iconClass: '',
        };
    }
  };

  const config = getStateConfig();
  const Icon = config.icon;

  const formatLastSync = () => {
    if (!lastSyncTime) return 'Never';
    
    const now = new Date();
    const diff = now.getTime() - lastSyncTime.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (seconds < 60) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return lastSyncTime.toLocaleDateString();
  };

  return (
    <div className="flex items-center gap-3">
      {/* Status Badge */}
      <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${config.bgColor}`}>
        <CloudIcon className={`w-4 h-4 ${config.color}`} />
        <Icon className={`w-4 h-4 ${config.color} ${config.iconClass}`} />
        <span className={`text-sm font-medium ${config.color}`}>
          {config.text}
        </span>
      </div>

      {/* Last Sync Time */}
      {lastSyncTime && syncState === 'synced' && (
        <span className="text-xs text-gray-500">
          {formatLastSync()}
        </span>
      )}

      {/* Manual Sync Button */}
      <button
        onClick={handleManualSync}
        disabled={isManualSyncing || syncState === 'syncing'}
        className={`p-2 rounded-lg transition-colors ${
          isManualSyncing || syncState === 'syncing'
            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
            : 'bg-blue-600 text-white hover:bg-blue-700'
        }`}
        title="Manual sync"
      >
        <ArrowPathIcon
          className={`w-4 h-4 ${
            isManualSyncing || syncState === 'syncing' ? 'animate-spin' : ''
          }`}
        />
      </button>
    </div>
  );
};

export default SyncIndicator;
