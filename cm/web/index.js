import admin from "./admin";
import frontend from "./frontend";
import download from "./download";
import staticDownload from "./staticDownload";

export default fastify => {
    fastify.get(fastify.zoiaModulesConfig["cm"].routes.cm, admin());
    fastify.get(`/:language${fastify.zoiaModulesConfig["cm"].routes.cm}`, admin());
    fastify.get(fastify.zoiaModulesConfig["cm"].routes.frontend, frontend());
    fastify.get(`/:language${fastify.zoiaModulesConfig["cm"].routes.frontend}`, frontend());
    fastify.get(fastify.zoiaModulesConfig["cm"].routes.download, download());
    fastify.get(fastify.zoiaModulesConfig["cm"].routes.staticDownload, staticDownload());
};
