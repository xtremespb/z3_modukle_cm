import apiConfigSave from "./apiConfigSave";
import apiConfigLoad from "./apiConfigLoad";
import apiGenerate from "./apiGenerate";
import apiFilesList from "./apiFilesList";
import apiFilesDelete from "./apiFilesDelete";
import apiCodesList from "./apiCodesList";
import apiCodesDelete from "./apiCodesDelete";
import apiImportCodes from "./apiImportCodes";
import apiStatsExport from "./apiStatsExport";
import apiFrontendFilesList from "./apiFrontendFilesList";

export default fastify => {
    fastify.post("/api/cm/config/save", apiConfigSave());
    fastify.post("/api/cm/config/load", apiConfigLoad());
    fastify.post("/api/cm/card/generate", apiGenerate());
    fastify.post("/api/cm/files/list", apiFilesList());
    fastify.post("/api/cm/files/delete", apiFilesDelete());
    fastify.post("/api/cm/codes/list", apiCodesList());
    fastify.post("/api/cm/codes/delete", apiCodesDelete());
    fastify.post("/api/cm/codes/import", apiImportCodes());
    fastify.post("/api/cm/stats/export", apiStatsExport());
    fastify.post("/api/cm/frontend/files/list", apiFrontendFilesList());
};
