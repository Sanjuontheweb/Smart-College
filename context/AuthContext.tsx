import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEMO_USERS, UserProfile } from '@/constants/CampusData';
import { LocalCampusDB } from '@/services/localDb';

export type UserRole = 'student' | 'faculty' | 'admin';

interface AuthContextType {
  user: UserProfile;
  role: UserRole;
  isAuthenticated: boolean;
  isLoading: boolean;
  studentsList: UserProfile[];
  facultiesList: UserProfile[];
  switchRole: (newRole: UserRole) => Promise<void>;
  switchUser: (targetUser: UserProfile) => Promise<void>;
  refreshUsers: () => Promise<void>;
  updateProfile: (updated: Partial<UserProfile>) => void;
}

const AuthContext = createContext<AuthContextType>({
  user: DEMO_USERS.student,
  role: 'student',
  isAuthenticated: true,
  isLoading: false,
  studentsList: [],
  facultiesList: [],
  switchRole: async () => {},
  switchUser: async () => {},
  refreshUsers: async () => {},
  updateProfile: () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [role, setRoleState] = useState<UserRole>('student');
  const [user, setUser] = useState<UserProfile>(DEMO_USERS.student);
  const [isLoading, setIsLoading] = useState(false);
  const [studentsList, setStudentsList] = useState<UserProfile[]>([]);
  const [facultiesList, setFacultiesList] = useState<UserProfile[]>([]);

  const refreshUsers = async () => {
    try {
      const [students, faculties] = await Promise.all([
        LocalCampusDB.getStudents(),
        LocalCampusDB.getFaculties(),
      ]);
      setStudentsList(students);
      setFacultiesList(faculties);
    } catch (e) {
      console.warn('[AuthContext] Error loading user lists:', e);
    }
  };

  useEffect(() => {
    const loadSession = async () => {
      setIsLoading(true);
      await LocalCampusDB.init();
      await refreshUsers();

      try {
        const savedUserJson = await AsyncStorage.getItem('@sc_current_active_user');
        if (savedUserJson) {
          const parsed = JSON.parse(savedUserJson) as UserProfile;
          setUser(parsed);
          setRoleState(parsed.role);
        } else {
          const savedRole = await AsyncStorage.getItem('@current_active_role');
          if (savedRole === 'student' || savedRole === 'faculty' || savedRole === 'admin') {
            setRoleState(savedRole);
            setUser(DEMO_USERS[savedRole]);
          }
        }
      } catch (e) {
        console.warn('[AuthContext] Error reading saved user:', e);
      } finally {
        setIsLoading(false);
      }
    };

    loadSession();
  }, []);

  const switchRole = async (newRole: UserRole) => {
    setRoleState(newRole);
    let target = DEMO_USERS[newRole];

    if (newRole === 'student' && studentsList.length > 0) {
      target = studentsList[0];
    } else if (newRole === 'faculty' && facultiesList.length > 0) {
      target = facultiesList[0];
    }

    setUser(target);
    await AsyncStorage.setItem('@current_active_role', newRole);
    await AsyncStorage.setItem('@sc_current_active_user', JSON.stringify(target));
  };

  const switchUser = async (targetUser: UserProfile) => {
    setUser(targetUser);
    setRoleState(targetUser.role);
    await AsyncStorage.setItem('@current_active_role', targetUser.role);
    await AsyncStorage.setItem('@sc_current_active_user', JSON.stringify(targetUser));
  };

  const updateProfile = (updated: Partial<UserProfile>) => {
    setUser((prev) => {
      const next = { ...prev, ...updated };
      AsyncStorage.setItem('@sc_current_active_user', JSON.stringify(next));
      return next;
    });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        isAuthenticated: true,
        isLoading,
        studentsList,
        facultiesList,
        switchRole,
        switchUser,
        refreshUsers,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
export default AuthContext;
