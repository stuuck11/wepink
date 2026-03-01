import React, { createContext, useContext, useState, useEffect } from "react";

interface Settings {
  top_bar_active: string;
  top_bar_text: string;
  logo_url: string;
  whatsapp_active: string;
  whatsapp_number: string;
  [key: string]: string;
}

interface SettingsContextType {
  settings: Settings;
  loading: boolean;
  refreshSettings: () => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<Settings>({
    top_bar_active: "1",
    top_bar_text: "Garanta agora o seu kit we favorito!",
    logo_url: "https://imgur.com/rcC8nAo.png",
    whatsapp_active: "1",
    whatsapp_number: "5511999999999"
  });
  const [loading, setLoading] = useState(true);

  const fetchSettings = async () => {
    try {
      const res = await fetch("/api/settings");
      const data = await res.json();
      setSettings(data);
    } catch (err) {
      console.error("Error fetching settings:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  return (
    <SettingsContext.Provider value={{ settings, loading, refreshSettings: fetchSettings }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) throw new Error("useSettings must be used within a SettingsProvider");
  return context;
};
