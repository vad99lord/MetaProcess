export const dirWithFiles = [
    {
        name: "tests",
        fullPath: "C:/mocks",
        files: {
            create: [
                {
                    name: "test.txt",
                    fullPath: "C:/mocks/test"
                },
                {
                    name: "test2.txt",
                    fullPath: "C:/mocks/test"
                },
                {
                    name: "test3.txt",
                    fullPath: "C:/mocks/test"
                },
            ]
        }
    },
    {
        name: "work",
        fullPath: "C:/mocks",
        files: {
            create: [
                {
                    name: "report.pdf",
                    fullPath: "C:/mocks/work"
                },
                {
                    name: "draft.doc",
                    fullPath: "C:/mocks/work"
                },
            ]
        }
    }
]

export const vertices = [
    {
        id: 1,
        name: "stage 1",
    },
    {
        id: 2,
        name: "stage 2",
    },
    {
        id: 3,
        name: "stage 3",
    },
    {
        id: 4,
        name: "stage 4",
    },
    {
        id: 5,
        name: "meta stage",
        meta: true,
    },
]

export const edges = [
    {
        name: "1 - 2",
        startVertex: {
            connect: {
                id : 1
            }
        },
        endVertex: {
            connect: {
                id : 2
            }
        },
    },
    {
        name: "2 - 3",
        startVertex: {
            connect: {
                id : 2
            }
        },
        endVertex: {
            connect: {
                id : 3
            }
        },
    },
    {
        name: "3 - 4",
        startVertex: {
            connect: {
                id : 3
            }
        },
        endVertex: {
            connect: {
                id : 4
            }
        },
    },
    {
        name: "meta - 1",
        startVertex: {
            connect: {
                id : 3
            }
        },
        endVertex: {
            connect: {
                id : 4
            }
        },
    },
    {
        name: "meta - 2",
        startVertex: {
            connect: {
                id : 3
            }
        },
        endVertex: {
            connect: {
                id : 4
            }
        },
    },
    {
        name: "meta - 3",
        startVertex: {
            connect: {
                id : 3
            }
        },
        endVertex: {
            connect: {
                id : 4
            }
        },
    },
    {
        name: "meta - 4",
        startVertex: {
            connect: {
                id : 3
            }
        },
        endVertex: {
            connect: {
                id : 4
            }
        },
    },
]