import { useEffect, useState } from 'react';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';

export function useNetworkStatus() {
  const [isConnected, setIsConnected] = useState(true);
  const [isWifi, setIsWifi] = useState(false);

  useEffect(() => {
    const unsub = NetInfo.addEventListener((state: NetInfoState) => {
      setIsConnected(!!state.isConnected && !!state.isInternetReachable);
      setIsWifi(state.type === 'wifi');
    });
    NetInfo.fetch().then((state) => {
      setIsConnected(!!state.isConnected && !!state.isInternetReachable);
      setIsWifi(state.type === 'wifi');
    });
    return unsub;
  }, []);

  return { isConnected, isWifi };
}
