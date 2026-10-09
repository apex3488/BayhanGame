"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";
import type { ApiError, ApiResult } from "@/lib/api/result";

export type ResourceStatus = "idle" | "loading" | "success" | "error";

export interface ResourceEntry<T> {
  status: ResourceStatus;
  data: T | undefined;
  error: ApiError | undefined;
}

const IDLE: ResourceEntry<never> = { status: "idle", data: undefined, error: undefined };

const entries = new Map<string, ResourceEntry<unknown>>();
const inflight = new Map<string, Promise<void>>();
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getEntry<T>(key: string): ResourceEntry<T> {
  return (entries.get(key) as ResourceEntry<T> | undefined) ?? IDLE;
}

function setEntry<T>(key: string, entry: ResourceEntry<T>) {
  entries.set(key, entry as ResourceEntry<unknown>);
  emit();
}

export function loadResource<T>(key: string, loader: () => Promise<ApiResult<T>>, force = false): Promise<void> {
  const current = getEntry<T>(key);
  const pending = inflight.get(key);
  if (pending) return pending;
  if (!force && current.status === "success") return Promise.resolve();

  setEntry<T>(key, { status: "loading", data: current.data, error: undefined });
  const promise = loader()
    .then((result) => {
      setEntry<T>(
        key,
        result.ok
          ? { status: "success", data: result.data, error: undefined }
          : { status: "error", data: current.data, error: result.error },
      );
    })
    .catch((error: unknown) => {
      setEntry<T>(key, {
        status: "error",
        data: current.data,
        error: { code: "unknown", detail: error instanceof Error ? error.message : String(error) },
      });
    })
    .finally(() => inflight.delete(key));
  inflight.set(key, promise);
  return promise;
}

/** Apply an optimistic-free local update with data the server (or demo sandbox) already returned. */
export function updateResource<T>(key: string, updater: (data: T) => T): void {
  const current = getEntry<T>(key);
  if (current.data === undefined) return;
  setEntry<T>(key, { ...current, data: updater(current.data) });
}

/** Update every cached resource whose key starts with the prefix (e.g. all locales of the player). */
export function updateResources<T>(prefix: string, updater: (data: T) => T): void {
  for (const key of Array.from(entries.keys())) {
    if (key.startsWith(prefix)) updateResource<T>(key, updater);
  }
}

export function invalidateResources(prefix: string): void {
  let changed = false;
  for (const key of Array.from(entries.keys())) {
    if (key.startsWith(prefix) && !inflight.has(key)) {
      entries.delete(key);
      changed = true;
    }
  }
  if (changed) emit();
}

export interface Resource<T> extends ResourceEntry<T> {
  reload: () => void;
}

export function useResource<T>(key: string, loader: () => Promise<ApiResult<T>>): Resource<T> {
  const entry = useSyncExternalStore(
    subscribe,
    () => getEntry<T>(key),
    () => IDLE as ResourceEntry<T>,
  );

  useEffect(() => {
    if (getEntry(key).status === "idle") void loadResource(key, loader);
    // The key fully identifies the request; loader identity changes every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const reload = useCallback(() => void loadResource(key, loader, true), [key, loader]);
  return { ...entry, reload };
}
