import { AxiosError } from 'axios';

export const getAxiosErrorMessage = (error: unknown): string | null => {
  if (error instanceof AxiosError) {
    return error.response?.data?.error ?? error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return null;
};
