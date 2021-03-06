import { dirWithFiles, edges as mockEdges, vertices as mockVertices } from './mocks'
import { Prisma, PrismaClient} from '@prisma/client'
const prisma = new PrismaClient()
async function main() {
    for (let dirFiles of dirWithFiles) {
        await prisma.directory.create({
            data: dirFiles
        })
    };
    for (let vertex of mockVertices) {
        await prisma.vertex.create({
            data: vertex
        })
    };
    for (let edge of mockEdges) {
        await prisma.edge.create({
            data: edge
        })
    };

    //files to graph sample connections
    let files = await prisma.file.findMany({take : 5});
    const vertices = await prisma.vertex.findMany({
        where : {
            meta : false
        },
        take : 3,
    });
    const edges = await prisma.edge.findMany({
        where : {
            inMeta : false
        },
        take : 2
    });
    
    for (let i = 0;i < vertices.length ; i++){
        await prisma.vertex.update({
            where: {
                id: vertices[i].id,
              },
            data : {
                files : {
                    connect : {
                        id : files[i].id,
                    }
                } 
            }  
        })
    };
    files = files.slice(vertices.length,files.length+1);
    for (let i = 0;i < edges.length ; i++){
        await prisma.edge.update({
            where: {
                id: edges[i].id,
              },
            data : {
                files : {
                    connect : {
                        id : files[i].id,
                    }
                } 
            }  
        })
    };

    const metaV = await prisma.vertex.findFirst({
        where: { meta: true }
    })
    const dirIds = await prisma.directory.findMany({
        select : {
            id : true
        },
    })
    await prisma.vertex.update({
        where: {
            id : metaV!.id
          },
        data : {
            directories : {
                connect : dirIds,
            }, 
        }  
    })

    

    /*const metaV = await prisma.vertex.findFirst({
        where: { meta: true }
    })
    const verts = await prisma.vertex.findMany({
        where: { meta: false }
    })
    const metaEdges = [];
    for (let v of verts) {
        metaEdges.push({
            name: "meta " + v.id,
            endVertex: {
                connect : {
                    id : v.id
                }
            },
            inMeta: true 
        });
    }

    await prisma.vertex.update({
        where: { id: metaV!.id },
        data: {
            startEdges: {
                create: metaEdges,
            }
        }
    })*/
}
main()
    .catch(e => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })