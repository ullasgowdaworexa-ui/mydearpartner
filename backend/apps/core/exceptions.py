from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status
import logging

logger = logging.getLogger(__name__)

def custom_exception_handler(exc, context):
    """
    Standardizes all exception responses to:
    {
      "success": false,
      "message": "...",
      "data": null,
      "errors": {...}
    }
    """
    response = exception_handler(exc, context)

    if response is not None:
        errors = response.data
        message = "Validation failed."
        
        if isinstance(errors, dict):
            if 'detail' in errors:
                message = errors.pop('detail')
                if not errors:
                    errors = {'detail': [message]}
        elif isinstance(errors, list):
            errors = {'non_field_errors': errors}

        response.data = {
            'success': False,
            'message': message,
            'data': None,
            'errors': errors
        }
    else:
        # Log unhandled exception details
        logger.exception("Unhandled server exception: %s", str(exc), exc_info=exc)
        
        response = Response(
            data={
                'success': False,
                'message': 'A server error occurred. Please contact support if the issue persists.',
                'data': None,
                'errors': {
                    'detail': 'An internal server error occurred.'
                }
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

    return response

