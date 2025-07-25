import { configureStore, createSlice } from '@reduxjs/toolkit';

interface SettingsState {
  language: 'en' | 'he';
}

const initialState: SettingsState = {
  language: 'he',
};

const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {
    toggleLanguage: (state) => {
      state.language = state.language === 'en' ? 'he' : 'en';
    },
  },
});

export const { toggleLanguage } = settingsSlice.actions;

export const store = configureStore({
  reducer: {
    settings: settingsSlice.reducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
