import { beforeEach, describe, expect, it, vi } from "vitest";
import Exa from "../src";
import {
  CompanyEntity,
  CreateImportParameters,
  CreateImportParametersFormat,
  CreateImportResponse,
  CreateImportResponseFailedReason,
  CreateImportResponseFormat,
  CreateImportResponseObject,
  CreateImportResponseStatus,
  Import,
  ImportFailedReason,
  ImportFormat,
  ImportObject,
  ImportStatus,
  ListImportsResponse,
  UpdateImport,
} from "../src/websets/openapi";

describe("Websets Imports API", () => {
  let exa: Exa;

  // Helper to create a mock Import
  const createMockImport = (
    status: ImportStatus = ImportStatus.completed
  ): Import => ({
    id: "import_123456",
    object: ImportObject.import,
    status,
    title: "Test Company Import",
    count: 5,
    format: ImportFormat.csv,
    entity: { type: "company" } as CompanyEntity,
    metadata: { source: "test", description: "Test import" },
    failedAt: status === ImportStatus.failed ? "2023-01-01T01:00:00Z" : null,
    failedMessage: status === ImportStatus.failed ? "Test failure" : null,
    failedReason: (status === ImportStatus.failed
      ? ImportFailedReason.invalid_format
      : null) as ImportFailedReason,
    createdAt: "2023-01-01T00:00:00Z",
    updatedAt: "2023-01-01T00:30:00Z",
  });

  // Helper to create a mock CreateImportResponse
  const createMockImportResponse = (): CreateImportResponse => ({
    id: "import_123456",
    object: CreateImportResponseObject.import,
    status: CreateImportResponseStatus.pending,
    title: "Test Company Import",
    count: 5,
    format: CreateImportResponseFormat.csv,
    entity: { type: "company" } as CompanyEntity,
    metadata: { source: "test", description: "Test import" },
    failedAt: null,
    failedMessage: null,
    failedReason: null as unknown as CreateImportResponseFailedReason,
    uploadUrl: "https://test-bucket.s3.amazonaws.com/upload-url",
    uploadValidUntil: "2023-01-01T01:00:00Z",
    createdAt: "2023-01-01T00:00:00Z",
    updatedAt: "2023-01-01T00:00:00Z",
  });

  beforeEach(() => {
    vi.resetAllMocks();
    exa = new Exa("test-api-key", "https://api.exa.ai");
  });

  describe("Import Operations", () => {
    it("should create a new Import", async () => {
      const mockResponse: CreateImportResponse = createMockImportResponse();

      const requestSpy = vi
        .spyOn(exa.websets.imports as any, "request")
        .mockResolvedValueOnce(mockResponse);

      const createParams: CreateImportParameters = {
        title: "Test Company Import",
        count: 5,
        size: 1,
        format: CreateImportParametersFormat.csv,
        entity: { type: "company" } as CompanyEntity,
        csv: {
          identifier: 1,
        },
        metadata: {
          source: "test",
          description: "Test import",
        },
      };

      const result = await exa.websets.imports.create(createParams);

      expect(requestSpy).toHaveBeenCalledWith(
        "/v0/imports",
        "POST",
        createParams
      );
      expect(result).toEqual(mockResponse);
    });

    it("should get an Import by ID", async () => {
      const mockResponse: Import = createMockImport();

      const requestSpy = vi
        .spyOn(exa.websets.imports as any, "request")
        .mockResolvedValueOnce(mockResponse);

      const result = await exa.websets.imports.get("import_123456");

      expect(requestSpy).toHaveBeenCalledWith(
        "/v0/imports/import_123456",
        "GET"
      );
      expect(result).toEqual(mockResponse);
    });

    it("should list Imports", async () => {
      const mockImportData: Import = createMockImport();

      const mockResponse: ListImportsResponse = {
        data: [mockImportData],
        hasMore: false,
        nextCursor: null,
      };

      const requestSpy = vi
        .spyOn(exa.websets.imports as any, "request")
        .mockResolvedValueOnce(mockResponse);

      const listOptions = { limit: 10, cursor: "test_cursor" };
      const result = await exa.websets.imports.list(listOptions);

      expect(requestSpy).toHaveBeenCalledWith(
        "/v0/imports",
        "GET",
        undefined,
        listOptions
      );
      expect(result).toEqual(mockResponse);
    });

    it("should update an Import", async () => {
      const mockResponse: Import = createMockImport();
      mockResponse.title = "Updated Test Import";
      mockResponse.metadata = {
        source: "test",
        description: "Updated",
        processed: "true",
      };

      const requestSpy = vi
        .spyOn(exa.websets.imports as any, "request")
        .mockResolvedValueOnce(mockResponse);

      const updateParams: UpdateImport = {
        title: "Updated Test Import",
        metadata: {
          source: "test",
          description: "Updated",
          processed: "true",
        },
      };

      const result = await exa.websets.imports.update(
        "import_123456",
        updateParams
      );

      expect(requestSpy).toHaveBeenCalledWith(
        "/v0/imports/import_123456",
        "PATCH",
        updateParams
      );
      expect(result).toEqual(mockResponse);
    });

    it("should delete an Import", async () => {
      const mockResponse: Import = createMockImport();

      const requestSpy = vi
        .spyOn(exa.websets.imports as any, "request")
        .mockResolvedValueOnce(mockResponse);

      const result = await exa.websets.imports.delete("import_123456");

      expect(requestSpy).toHaveBeenCalledWith(
        "/v0/imports/import_123456",
        "DELETE"
      );
      expect(result).toEqual(mockResponse);
    });
  });

  describe("Wait Until Completed", () => {
    it("should wait until import is completed", async () => {
      const processingImport = createMockImport(ImportStatus.processing);
      const completedImport = createMockImport(ImportStatus.completed);

      const requestSpy = vi
        .spyOn(exa.websets.imports as any, "request")
        .mockResolvedValueOnce(processingImport)
        .mockResolvedValueOnce(completedImport);

      // Mock setTimeout to immediately resolve
      vi.spyOn(global, "setTimeout").mockImplementation((callback: any) => {
        callback();
        return {} as any;
      });

      const onPollMock = vi.fn();
      const result = await exa.websets.imports.waitUntilCompleted(
        "import_123456",
        {
          timeout: 10000,
          pollInterval: 1000,
          onPoll: onPollMock,
        }
      );

      expect(requestSpy).toHaveBeenCalledTimes(2);
      expect(requestSpy).toHaveBeenNthCalledWith(
        1,
        "/v0/imports/import_123456",
        "GET"
      );
      expect(requestSpy).toHaveBeenNthCalledWith(
        2,
        "/v0/imports/import_123456",
        "GET"
      );
      expect(onPollMock).toHaveBeenCalledWith(ImportStatus.processing);
      expect(result).toEqual(completedImport);
    });

    it("should throw error when import fails", async () => {
      const failedImport = createMockImport(ImportStatus.failed);

      const requestSpy = vi
        .spyOn(exa.websets.imports as any, "request")
        .mockResolvedValueOnce(failedImport);

      await expect(
        exa.websets.imports.waitUntilCompleted("import_123456")
      ).rejects.toThrow("Import import_123456 failed: Test failure");

      expect(requestSpy).toHaveBeenCalledWith(
        "/v0/imports/import_123456",
        "GET"
      );
    });

    it("should throw error when import times out", async () => {
      const processingImport = createMockImport(ImportStatus.processing);

      const requestSpy = vi
        .spyOn(exa.websets.imports as any, "request")
        .mockResolvedValue(processingImport);

      // Mock setTimeout to immediately resolve (simulating rapid polling)
      vi.spyOn(global, "setTimeout").mockImplementation((callback: any) => {
        callback();
        return {} as any;
      });

      await expect(
        exa.websets.imports.waitUntilCompleted("import_123456", {
          timeout: 100, // Very short timeout
          pollInterval: 50,
        })
      ).rejects.toThrow("Import import_123456 did not complete within 100ms");

      expect(requestSpy).toHaveBeenCalled();
    });

    it("should use default options when none provided", async () => {
      const completedImport = createMockImport(ImportStatus.completed);

      const requestSpy = vi
        .spyOn(exa.websets.imports as any, "request")
        .mockResolvedValueOnce(completedImport);

      const result =
        await exa.websets.imports.waitUntilCompleted("import_123456");

      expect(requestSpy).toHaveBeenCalledWith(
        "/v0/imports/import_123456",
        "GET"
      );
      expect(result).toEqual(completedImport);
    });
  });

  describe("Error Handling", () => {
    it("should handle API errors properly", async () => {
      const requestSpy = vi
        .spyOn(exa.websets.imports as any, "request")
        .mockRejectedValueOnce(new Error("API Error"));

      await expect(exa.websets.imports.get("import_123456")).rejects.toThrow(
        "API Error"
      );

      expect(requestSpy).toHaveBeenCalledWith(
        "/v0/imports/import_123456",
        "GET"
      );
    });

    it("should handle invalid import status in waitUntilCompleted", async () => {
      const pendingImport = createMockImport(ImportStatus.pending);
      const completedImport = createMockImport(ImportStatus.completed);

      const requestSpy = vi
        .spyOn(exa.websets.imports as any, "request")
        .mockResolvedValueOnce(pendingImport)
        .mockResolvedValueOnce(completedImport);

      // Mock setTimeout to immediately resolve
      vi.spyOn(global, "setTimeout").mockImplementation((callback: any) => {
        callback();
        return {} as any;
      });

      const result =
        await exa.websets.imports.waitUntilCompleted("import_123456");

      expect(requestSpy).toHaveBeenCalledTimes(2);
      expect(result).toEqual(completedImport);
    });
  });
});
