import React, { createContext, useContext, useState, useCallback } from 'react';

const TaskContext = createContext();

export const TaskProvider = ({ children }) => {
  const [lastAddedTask, setLastAddedTask] = useState(null);

  const notifyTaskAdded = useCallback((task) => {
    // Aynı görevi iki kez ekleyebilme ihtimaline karşı _timestamp veriyoruz
    setLastAddedTask({ ...task, _timestamp: Date.now() });
  }, []);

  return (
    <TaskContext.Provider value={{ lastAddedTask, notifyTaskAdded }}>
      {children}
    </TaskContext.Provider>
  );
};

export const useTaskContext = () => {
  const context = useContext(TaskContext);
  if (!context) {
    throw new Error('useTaskContext must be used within a TaskProvider');
  }
  return context;
};
