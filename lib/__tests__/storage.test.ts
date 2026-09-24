import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import type { UIMessage } from "ai";
import {
	createConversation,
	loadConversationData,
	updateConversationData,
	saveFeedback,
	loadFeedback,
	saveCompactedSummary,
} from "@/lib/storage";

function fakeLocalStorage() {
	const store = new Map<string, string>();
	return {
		getItem: (key: string) => store.get(key) ?? null,
		setItem: (key: string, value: string) => void store.set(key, value),
		removeItem: (key: string) => void store.delete(key),
	};
}

const msg = (id: string, text: string): UIMessage => ({ id, role: "user", parts: [{ type: "text", text }] }) as UIMessage;

beforeEach(() => {
	vi.stubGlobal("window", {}); // storage.ts returns early when window is undefined
	vi.stubGlobal("localStorage", fakeLocalStorage());
});

afterEach(() => {
	vi.unstubAllGlobals();
});

describe("updateConversationData", () => {
	it("keeps feedback when messages are updated (the original bug)", () => {
		const { id } = createConversation();
		saveFeedback(id, "m1", "up");

		updateConversationData(id, { messages: [msg("m1", "hi"), msg("m2", "more")], durations: {} });

		expect(loadFeedback(id)).toEqual({ m1: "up" });
		expect(loadConversationData(id).messages).toHaveLength(2);
	});

	it("keeps compaction fields when messages are updated", () => {
		const { id } = createConversation();
		saveCompactedSummary(id, "summary text", 4, "sig");

		updateConversationData(id, { messages: [msg("m1", "hi")] });

		const data = loadConversationData(id);
		expect(data.compactedSummary).toBe("summary text");
		expect(data.summarizedUpTo).toBe(4);
		expect(data.compactedSignature).toBe("sig");
	});
});

describe("saveFeedback", () => {
	it("removes the rating when called with null", () => {
		const { id } = createConversation();
		saveFeedback(id, "m1", "down");
		saveFeedback(id, "m2", "up");

		saveFeedback(id, "m1", null);

		expect(loadFeedback(id)).toEqual({ m2: "up" });
	});
});

describe("loadConversationData", () => {
	it("returns defaults for missing or corrupt data", () => {
		expect(loadConversationData("missing")).toEqual({ messages: [], durations: {} });
		localStorage.setItem("chat-data-bad", "{not json");
		expect(loadConversationData("bad")).toEqual({ messages: [], durations: {} });
	});
});
