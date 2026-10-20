import { useMutation } from '@tanstack/react-query';
import { signIn } from '@/entities/session';

export function useSignIn() {
  return useMutation({ mutationFn: signIn, retry: false });
}
