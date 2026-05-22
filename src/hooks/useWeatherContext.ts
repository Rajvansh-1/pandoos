import { useState, useEffect } from 'react';

interface WeatherContext {
  temp: number | null;
  condition: string | null;
  isRaining: boolean;
  isSunny: boolean;
  isLoading: boolean;
  error: string | null;
}

export function useWeatherContext(): WeatherContext {
  const [state, setState] = useState<WeatherContext>({
    temp: null,
    condition: null,
    isRaining: false,
    isSunny: false,
    isLoading: true,
    error: null,
  });

  useEffect(() => {
    // 1. Get location
    if (!navigator.geolocation) {
      setState(s => ({ ...s, isLoading: false, error: 'Geolocation not supported' }));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const lat = position.coords.latitude;
          const lon = position.coords.longitude;
          
          // 2. Fetch weather from Open-Meteo (No API key required)
          const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code`);
          const data = await res.json();
          
          const temp = data.current.temperature_2m;
          const code = data.current.weather_code;
          
          // WMO Weather interpretation codes
          // 0: Clear sky
          // 1, 2, 3: Mainly clear, partly cloudy, and overcast
          // 45, 48: Fog
          // 51-67: Drizzle / Rain / Freezing Rain
          // 71-77: Snow
          // 80-82: Rain showers
          // 95-99: Thunderstorm
          
          const isSunny = code === 0 || code === 1;
          const isRaining = code >= 51 && code <= 67 || code >= 80 && code <= 99;
          
          let conditionStr = 'cloudy';
          if (isSunny) conditionStr = 'sunny';
          if (isRaining) conditionStr = 'raining';
          if (code >= 71 && code <= 77) conditionStr = 'snowing';

          setState({
            temp,
            condition: conditionStr,
            isRaining,
            isSunny,
            isLoading: false,
            error: null,
          });
        } catch (err) {
          setState(s => ({ ...s, isLoading: false, error: 'Failed to fetch weather' }));
        }
      },
      (err) => {
        setState(s => ({ ...s, isLoading: false, error: err.message }));
      }
    );
  }, []);

  return state;
}
