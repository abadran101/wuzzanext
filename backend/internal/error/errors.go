package errorx

import "errors"

var ErrNotEnoughSpace = errors.New("not enough storage space")
var ErrDeviceLimitExceeded = errors.New("device limit exceeded: user can register maximum 5 devices")
