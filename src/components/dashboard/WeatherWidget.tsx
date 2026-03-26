import { useState, useEffect } from 'react';

const WeatherWidget = () => {
  const [weather, setWeather] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchWeather = async () => {
      try {
        const response = await fetch('http://localhost:3000/api/weather');
        if (!response.ok) throw new Error('Network response error');
        const data = await response.json();
        setWeather(data);
      } catch (err: any) {
        setError(err.message);
      }
    };

    fetchWeather();
    const intervalId = setInterval(fetchWeather, 15 * 60 * 1000); // refresh every 15 minutes
    return () => clearInterval(intervalId); // cleanup on unmount
  }, []);

  if (error) return <div className="text-red-500 p-4">Loading weather failed: {error}</div>;
  if (!weather) return <div className="text-emerald-700 p-4 animate-pulse">Loading operational weather data...</div>;

  // fetch weather in 12 hours ---
  
  // 1. get current time in epoch seconds
  const currentEpoch = weather.current.last_updated_epoch;

  //2. combine today's and tomorrow's hourly data into one array (some APIs split them by day, we want a continuous timeline) ---
  const allHours = [
    ...weather.forecast.forecastday[0].hour,
    ...(weather.forecast.forecastday[1] ? weather.forecast.forecastday[1].hour : [])
  ];

  // 3. filter out hours that are in the past and take the next 12 hours for display. This ensures our timeline is always relevant to the current time, even if the API returns a full 24-hour forecast starting from midnight.
  const nextHours = allHours
    .filter((hourData: any) => hourData.time_epoch >= currentEpoch)
    .slice(0, 12); 

  // format time from "2024-06-01 14:00" to "14:00" for display on the timeline. This keeps the UI clean and focused on the hour, which is most relevant for quick glances at the forecast.
  const formatTime = (timeStr: string) => {
    return timeStr.split(' ')[1];
  };

  return (
    <div className="bg-white rounded-[2rem] p-6 w-full flex flex-col md:flex-row items-center justify-between mb-6">
      
      {/* left side: current weather */}
      <div className="flex items-center space-x-6 md:pr-10 md:border-r md:border-gray-100 mb-6 md:mb-0 shrink-0">
        <img 
          src={weather.current.condition.icon} 
          alt="Weather Icon" 
          className="w-20 h-20 drop-shadow-sm"
        />
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{weather.location.name}</h2>
          <p className="text-sm text-gray-500 capitalize">{weather.current.condition.text}</p>
          <div className="text-4xl font-black text-gray-900 mt-1">
            {Math.round(weather.current.temp_c)}°
          </div>
        </div>
      </div>

      {/* right side: future 12-hour forecast (horizontal scrollable timeline) */}
      {/* [&::-webkit-scrollbar]:hidden 用于隐藏自带的丑陋滚动条，保持界面干净 */}
      <div className="flex flex-1 gap-6 w-full pl-0 md:pl-8 overflow-x-auto pb-2 [&::-webkit-scrollbar]:hidden" style={{ scrollbarWidth: 'none' }}>
        {nextHours.map((hour: any) => (
          <div key={hour.time_epoch} className="flex flex-col items-center min-w-[45px]">
            {/* time (e.g., 14:00) */}
            <p className="text-[11px] font-bold text-emerald-700 tracking-wider mb-2">
              {formatTime(hour.time)}
            </p>
            {/* weather icon */}
            <img 
              src={hour.condition.icon} 
              alt="Hourly Forecast" 
              className="w-10 h-10 mb-2 drop-shadow-sm"
            />
            {/* temperature */}
            <span className="font-bold text-gray-900 text-sm">
              {Math.round(hour.temp_c)}°
            </span>
            {/* chance of rain: only show if greater than 0, which is important for operational decisions */}
            {hour.chance_of_rain > 0 ? (
              <span className="text-[10px] text-blue-500 font-semibold mt-1">
                {hour.chance_of_rain}% 💧
              </span>
            ) : (
              <span className="text-[10px] text-transparent mt-1">0%</span> /* placeholder, maintains layout alignment */
            )}
          </div>
        ))}
      </div>

    </div>
  );
};

export default WeatherWidget;