import { Response } from 'express';

export class ApiResponse {
    static success<T>(res: Response, data: T, statusCode = 200) {
        return res.status(statusCode).json({
            status: 'success',
            data,
        });
    }

    static created<T>(res: Response, data: T) {
        return this.success(res, data, 201);
    }

    static noContent(res: Response) {
        return res.status(204).send();
    }

    static paginated<T>(
        res: Response,
        data: T[],
        page: number,
        limit: number,
        total: number
    ) {
        return res.json({
            status: 'success',
            data,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
                hasNext: page < Math.ceil(total / limit),
                hasPrev: page > 1,
            },
        });
    }
}
