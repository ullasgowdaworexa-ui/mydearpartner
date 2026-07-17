from rest_framework.response import Response

class ApiResponse(Response):
    """
    Standardized success API response:
    {
      "success": true,
      "message": "...",
      "data": {...},
      "errors": null
    }
    """
    def __init__(self, data=None, message="Request completed successfully.", success=True, errors=None, status=None, **kwargs):
        payload = {
            'success': success,
            'message': message,
            'data': data,
            'errors': errors
        }
        super().__init__(data=payload, status=status, **kwargs)
