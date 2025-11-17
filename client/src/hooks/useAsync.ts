import { useState, useEffect, useCallback } from "react";

interface AsyncState<T> {
  data: T | null;
  error: Error | undefined;
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
}

interface UseAsyncOptions {
  onSuccess?: (data: any) => void;
  onError?: (error: Error) => void;
  immediate?: boolean;
}

export function useAsync<T>(
  asyncFunction: () => Promise<T>,
  options: UseAsyncOptions = {},
  dependencies: any[] = []
) {
  const { onSuccess, onError, immediate = true } = options;

  const [state, setState] = useState<AsyncState<T>>({
    data: null,
    error: undefined,
    isLoading: immediate,
    isSuccess: false,
    isError: false,
  });

  const execute = useCallback(async () => {
    setState({
      data: null,
      error: undefined,
      isLoading: true,
      isSuccess: false,
      isError: false,
    });

    try {
      const data = await asyncFunction();
      setState({
        data,
        error: undefined,
        isLoading: false,
        isSuccess: true,
        isError: false,
      });
      onSuccess?.(data);
      return data;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      setState({
        data: null,
        error: err,
        isLoading: false,
        isSuccess: false,
        isError: true,
      });
      onError?.(err);
      throw err;
    }
  }, [asyncFunction, onSuccess, onError]);

  useEffect(() => {
    if (immediate) {
      execute();
    }
  }, [...dependencies]);

  const reset = useCallback(() => {
    setState({
      data: null,
      error: undefined,
      isLoading: false,
      isSuccess: false,
      isError: false,
    });
  }, []);

  return {
    ...state,
    execute,
    reset,
    refetch: execute,
  };
}

// Mutation用のフック（POST/PUT/DELETE等）
export function useMutation<T, TVariables = void>(
  mutationFn: (variables: TVariables) => Promise<T>,
  options: UseAsyncOptions = {}
) {
  const { onSuccess, onError } = options;

  const [state, setState] = useState<AsyncState<T>>({
    data: null,
    error: undefined,
    isLoading: false,
    isSuccess: false,
    isError: false,
  });

  const mutate = useCallback(
    async (variables: TVariables) => {
      setState({
        data: null,
        error: undefined,
        isLoading: true,
        isSuccess: false,
        isError: false,
      });

      try {
        const data = await mutationFn(variables);
        setState({
          data,
          error: undefined,
          isLoading: false,
          isSuccess: true,
          isError: false,
        });
        onSuccess?.(data);
        return data;
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        setState({
          data: null,
          error: err,
          isLoading: false,
          isSuccess: false,
          isError: true,
        });
        onError?.(err);
        throw err;
      }
    },
    [mutationFn, onSuccess, onError]
  );

  const reset = useCallback(() => {
    setState({
      data: null,
      error: undefined,
      isLoading: false,
      isSuccess: false,
      isError: false,
    });
  }, []);

  return {
    ...state,
    mutate,
    reset,
  };
}
