import { Prisma, PrismaClient} from '@prisma/client'
const prisma = new PrismaClient()
async function main() {
    const workspace = await prisma.workspace.create({
        data : {name : "MetaProcess"}
    });
    const vertices = await prisma.vertex.updateMany({
        data : {
            workspaceID : workspace!.id
        },
    });
    const edges = await prisma.edge.updateMany({
        data : {
            workspaceID : workspace!.id
        },
    });
}
main()
    .catch(e => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })