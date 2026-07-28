"use client";

import { createContext, useContext } from "react";

export interface UserData {
  id: string;
  login: string;
  fullName: string;
  dept: string | null;
  extraDepts: string[];
  role: "ADMIN" | "SUPERVISOR" | "EMPLOYEE";
  gender: "K" | "M";
  position: string | null;
  signatureBlock: string | null;
}

export const UserContext = createContext<UserData | null>(null);

export function useUser() {
  return useContext(UserContext);
}
